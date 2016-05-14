<!DOCTYPE html>
<!--suppress ALL -->
<html lang="en">
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
    <title>Visual Summary of a Data Set</title>
    <meta charset="UTF-8">
    <link rel="stylesheet" type="text/css" href="css/dc.css">
    <link rel="stylesheet" type="text/css" href="css/bootstrap.css">
    <link rel="stylesheet" type="text/css" href="css/main.css">
</head>
<body>



<!-- code from http://www.w3schools.com/php/php_file_upload.asp -->
<?php
$debug = false;
$target_dir = "uploads/";
$target_file = $target_dir . basename($_FILES["fileToUpload"]["name"]);
$uploadOk = 2;
$imageFileType = pathinfo($target_file, PATHINFO_EXTENSION);

if ($debug) {
    echo("files dump: " . var_dump($_FILES) . "<br />");
    echo("imgFileType: " . $imageFileType . "<br />");
    echo("targetFile: " . $target_file . "<br />");
}


// ========== CHECKS ==========
if (file_exists($target_file)) {
    // echo "Sorry, file already exists.";
    $uploadOk = 1;
}
// Check file size, max 500KB
if ($_FILES["fileToUpload"]["size"] > 500000) {
    echo "Sorry, your file is too large.";
    $uploadOk = 0;
}
// Allow certain file formats
if ($imageFileType != "csv") {
    echo "Sorry, only csv-files are allowed.";
    $uploadOk = 0;
}


// ========== UPLOAD ==========
// Check if $uploadOk is set to 0 by an error
if ($uploadOk == 0) {
    echo "Sorry, your file was not uploaded.";
// if everything is ok, try to upload file
} else {
    if ($uploadOk == 1 || move_uploaded_file($_FILES["fileToUpload"]["tmp_name"], $target_file)) {
        if ($debug) {
            echo "The file " . basename($_FILES["fileToUpload"]["name"]) .
                (($uploadOk == 1) ? " already existed; using the existing one." : " has been uploaded.");
        }
        echo "<input type='hidden' id='csvTargetFile'         value='" . $target_file . "' />";
        echo "<input type='hidden' id='csvSeparator'          value='" . $_POST['csvSeparator'] . "' />";
        echo "<input type='hidden' id='csvDecimalMark'        value='" . $_POST['decimalMark'] . "' />";
        echo "<input type='hidden' id='csvThousandsSeparator' value='" . $_POST['thousandsSeparator'] . "' />";
    } else {
        echo "Sorry, there was an error uploading your file.";
    }
}
?>



<div class="container-fluid">
    <div class="row">
        <div class="col-xs-12 dc-data-count" id="data-count">
            <h2>
                <small>
                    <span class="filter-count"></span> selected out of <span class="total-count"></span> records |
                    <a id="all" href="#">Reset All</a>
                </small>
            </h2>
        </div>
    </div>

    <div id="histograms"></div>

    <div class="row">
        <div class="col-xs-12" id="dataTableWrapper">
            <table class="table table-bordered table-striped" id="data-table"></table>
        </div>
    </div>
</div>



<script type="text/javascript" src="js/d3.js"></script>
<script type="text/javascript" src="js/crossfilter.js"></script>
<script type="text/javascript" src="js/dc.js"></script>
<script type="text/javascript" src="js/underscore-min.js"></script>
<script type="text/javascript" src="js/jquery-1.12.3.js"></script>
<script type="text/javascript" src="js/jquery.doubleScroll.js"></script>
<script type="text/javascript">

    // TODO only use if composite chart is used
    /* composite chart bug: brushing not applied
    bugfix from https://groups.google.com/forum/#!topic/dc-js-user-group/yI6_cbvgfbU
    edit the dc.js chart.brushing function */
    (function() {
        var compositeChart = dc.compositeChart;
        dc.compositeChart = function(parent, chartGroup) {
            var _chart = compositeChart(parent, chartGroup);

            _chart._brushing = function () {
                var extent = _chart.extendBrush();
                var rangedFilter = null;
                if(!_chart.brushIsEmpty(extent)) {
                    rangedFilter = dc.filters.RangedFilter(extent[0], extent[1]);
                }

                dc.events.trigger(function () {
                    if (!rangedFilter) {
                        _chart.filter(null);
                    } else {
                        _chart.replaceFilter(rangedFilter);
                    }
                    _chart.redrawGroup();
                }, dc.constants.EVENT_DELAY);
            };

            return _chart;
        };
    })();



// ======================================= GLOBAL VARIABLE DECLARATIONS =======================================
    // the data from the csv-file
    var csv;
    // 3D-array with the data from the csv, inside each cell is a CellInfo-Object, extended with info about Datatypes
    var cellInfo = [];
    // 2D-array with info about each column, inside each cell is a ColumnInfo-Object
    var columnInfo = [];
    // the crossfilter from our csv-file => used for brusing and linking
    var ndx;
    // dimension for the table, with the whole csv as dimension
    var allDim;
    // all histogramcharts
    var histogramCharts = [];
    // in each row, there is space for 4 histograms, used for storing how many histograms are in the last row currently
    var elemsInHistogramRow = Infinity;
    // csv-parameters, filled by js with values from hidden fields
    var csvUrl;
    var csvSeperator;
    var csvDecimalMark;
    var csvThousandsSeparator;
    // regular expressions, used for checking the datatype of each cell
    const regexpInt = /^[\-]{0,1}[0-9]+$/;
    const regexpDoubleComma = /^[\-]{0,1}[0-9]+[\,][0-9]+$/;
    const regexpDoublePeriod = /^[\-]{0,1}[0-9]+[\.][0-9]+$/;
    const regexpBoolean = /^(0|1|(true)|false){1}$/;



// ======================================= CLASS DECLARATIONS =======================================
    // tutorial on object-oriented-JS: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Introduction_to_Object-Oriented_JavaScript
    /**
     * class CellInfo
     * the constructor checks the type of [cellValue] via regexp, and sets boolean values (isInt, isDouble, etc.)
     * @param {string} cellValue
     */
    function CellInfo (cellValue) {
        this.cellValue = cellValue.trim();
        this.isEmpty = false;
        this.isFaulty = false;
        this.isInt = false;
        this.isDouble = false;
        this.isBoolean = false;

        if (this.cellValue === "" || this.cellValue === "-") {
            this.isEmpty = true;
        }

        if (csvThousandsSeparator != "") {
            if (regexpInt.exec(this.cellValue.replace(csvThousandsSeparator, "")) !== null) {
                this.cellValue = this.cellValue.replace(csvThousandsSeparator, "");
                this.isInt = true
            }
        } else {
            if (regexpInt.exec(this.cellValue) !== null) {
                this.isInt = true
            }
        }

        if (csvDecimalMark != ".") {
            if (regexpDoubleComma.exec(this.cellValue) !== null) {
                this.cellValue = this.cellValue.replace(csvDecimalMark, ".");
                this.isDouble = true;
            }
        } else {
            if (regexpDoublePeriod.exec(this.cellValue) !== null) {
                this.isDouble = true;
            }
        }

        if (regexpBoolean.exec(this.cellValue) !== null) {
            this.isBoolean = true;
        }
    }

    /**
     * setter for isOutlier
     * @param {boolean} isOutlier
     */
    CellInfo.prototype.setIsOutlier = function (isOutlier) {
        this.isOutlier = isOutlier;
    }


    /**
     * class ColumnInfo
     * multiple constructors for one class: http://stackoverflow.com/questions/7481988/multiple-constructor-in-javascript
     * this constructor can either be called with
     * 1) @param {string} name, then all the counters are initialized with 0
     * 2) @param {ColumnInfo} columnInfo, then columnInfo is initialized with the exact values from columnInfo
     */
    function ColumnInfo ( /* name | columnInfo */) {
        if (typeof arguments[0] === "string") { // name
            this.name = arguments[0];
            this.intCount = 0;
            this.doubleCount = 0;
            this.booleanCount = 0;
            this.emptyCount = 0;
            this.faultyCount = 0;
            this.sumError = 0;
        } else { // columnInfo
            // console.log(arguments[0]);
            this.name = arguments[0].name;
            this.intCount = arguments[0].intCount;
            this.doubleCount = arguments[0].doubleCount;
            this.booleanCount = arguments[0].booleanCount;
            this.emptyCount = arguments[0].emptyCount;
            this.faultyCount = arguments[0].faultyCount;
            this.datatype = arguments[0].datatype;
            this.sumError = arguments[0].sumError;
        }
    }

    /**
     * counts the int, double, boolean, empty values in the array (the array must contain CellInfo-objects)
     * @param {array} array
     */
    ColumnInfo.prototype.countDataTypes = function (array) {
        for (var i = 0; i < array.length; i++) {
            if (array[i].isInt)     this.intCount++;
            if (array[i].isDouble)  this.doubleCount++;
            if (array[i].isBoolean) this.booleanCount++;
            if (array[i].isEmpty)   this.emptyCount++;
        }
    }

    /**
     * setter for datatype
     * @param {string} datatype
     */
    ColumnInfo.prototype.setDatatype = function (datatype) {
        this.datatype = datatype;
    }

    /**
     * setter for sumError
     * @param {number} sumError
     */
    ColumnInfo.prototype.setSumError = function (sumError) {
        this.sumError = sumError;
    }


    /**
     * class IntColumn extends ColumnInfo
     * constructor, calculates the statistics for the [columnArray]
     * [columnInfo] is redirected to the super-constructor
     * @param {ColumnInfo} columnInfo
     * @param {array} columnArray
     */
    function IntColumn (columnInfo, columnArray) {
        // call super-constructor
        ColumnInfo.call(this, columnInfo);

        // sort values, standard is sort alphabetically, we want to sum numerically
        columnArray.sort( function sortNumber(a,b) { return a - b; } );

        // https://github.com/mbostock/d3/wiki/Arrays => API reference for array-, set-, maps-functions
        this.average = d3.mean(columnArray);

        this.firstQuartile  = d3.quantile(columnArray, 0.25);
        this.secondQuartile = d3.quantile(columnArray, 0.5);
        this.thirdQuartile  = d3.quantile(columnArray, 0.75);

        // iqr = inter quartile range = robust measure of scale
        // divide by 1.349 to remove bias
        this.iqr = (this.thirdQuartile - this.firstQuartile) / 1.349;
        this.deviation = d3.deviation(columnArray);

        this.min = d3.min(columnArray);
        this.max = d3.max(columnArray);

        this.uniqueValuesCount = d3.set(columnArray).values().length;

        // TODO this.sumOutliers = sumOutliers;
        // mean +- 2s or median +- 1.5iqr
    }

    IntColumn.prototype = Object.create(ColumnInfo.prototype);
    IntColumn.prototype.constructor = IntColumn;

    /**
     * setter for sumOutliers
     * @param {number} sumOutliers
     */
    IntColumn.prototype.setSumOutliers = function (sumOutliers) {
        this.sumOutliers = sumOutliers;
    }


    /**
     * class DoubleColumn extends ColumnInfo
     * constructor
     * [columnInfo] is redirected to the super-constructor (IntColumn), which has the same statistics as DoubleColumn
     * @param {ColumnInfo} columnInfo
     * @param {array} columnArray
     */
    function DoubleColumn (columnInfo, columnArray) {
        // call super-constructor
        IntColumn.call(this, columnInfo, columnArray);
    }

    DoubleColumn.prototype = Object.create(IntColumn.prototype);
    DoubleColumn.prototype.constructor = DoubleColumn;


    /**
     * class StringColumn extends ColumnInfo
     * constructor, calculates the statistics for the [columnArray]
     * [columnInfo] is redirected to the super-constructor
     * @param {ColumnInfo} columnInfo
     * @param {array} columnArray
     */
    function StringColumn (columnInfo, columnArray) {
        // call super-constructor
        ColumnInfo.call(this, columnInfo);

        var minStringLength = Infinity;
        var maxStringLength = -Infinity;
        var sumStringLength = 0;

        for (var i = 0; i < columnArray.length; i++) {
            sumStringLength += columnArray[i].length;
            if (columnArray[i].length < minStringLength) {
                minStringLength = columnArray[i].length;
            }
            if (maxStringLength < columnArray[i].length) {
                maxStringLength = columnArray[i].length;
            }
        }

        this.minLength = minStringLength;
        this.maxLength = maxStringLength;
        this.averageLength = sumStringLength /= (columnArray.length - this.emptyCount);
        this.uniqueValuesCount = d3.set(columnArray).values().length;
    }

    StringColumn.prototype = Object.create(ColumnInfo.prototype);
    StringColumn.prototype.constructor = StringColumn;


    /**
     * class BooleanColumn extends ColumnInfo
     * constructor, BooleanColumn does not have any stats to calculate
     * @param {ColumnInfo} columnInfo
     * @param {array} columnArray
     */
    function BooleanColumn (columnInfo, columnArray) {
        // call super-constructor
        ColumnInfo.call(this, columnInfo);
    }

    BooleanColumn.prototype = Object.create(ColumnInfo.prototype);
    BooleanColumn.prototype.constructor = BooleanColumn;


// ======================================= DOCUMENT READY FUNCTIONS =======================================
    // when the document is ready (dom loaded), start with the parsing and chart-generating
    // documentation: https://github.com/mbostock/d3/wiki/CSV

    $().ready(function () {
        // check hidden input fields for the csv-parameters
        csvUrl =                $("#csvTargetFile")[0].value;
        
        switch ($("#csvSeparator")[0].value) {
            case "comma":
                csvSeperator = ",";
                break;
            case "semicolon":
                csvSeperator = ";";
                break;
            case "tab":
                csvSeperator = "\t";
                break;
        }
        
        switch ($("#csvDecimalMark")[0].value) {
            case "dot":
                csvDecimalMark = ".";
                break;
            case "comma":
                csvDecimalMark = ",";
                break;
        }

        switch ($("#csvThousandsSeparator")[0].value) {
            case "none":
                csvThousandsSeparator = "";
                break;
            case "dot":
                csvThousandsSeparator = ".";
                break;
            case "blank":
                csvThousandsSeparator = " ";
                break;
            case "comma":
                csvThousandsSeparator = ",";
                break;
        }

        $.get(csvUrl)
                .done(function (data) {
                    console.log("URL fetched");
                    // correct ';' to ',' (';' is often used in german csv-files as delimiter)
                    csv = d3.dsv(csvSeperator, "text/csv").parseRows(data);
                    console.log(csv);
                    parseCSVData();
                    generateCharts();
                })
                .fail(function (xhr) {
                    console.log("URL fetch failed.");
                });
    });



// ======================================= LOCAL FUNCTIONS =======================================
    /**
     * parse the csv-file, extract the column names, try to get the column-datatypes
     * (first row is expected to be the header row)
     */
    function parseCSVData() {
        /* now we have an array with many arrays in it (all the rows from the csv).
         first, find the head-row, and the datatypes of the different columns.
         head row: the head row can be the first row of the document, but sometimes it's the second row, or it doesn't exist.
         datatype: iterate over the array, pick the datatype, which occurs the most.*/
        for (var m = 0; m < csv.length; m++) {
            cellInfo[m] = [];

            for (var i = 0; i < Math.min(csv[0].length, csv[m].length); i++) {
                if (m == 0) {
                    columnInfo[i] = new ColumnInfo(csv[m][i]);
                    continue; // because we don't want to count the header-row
                }

                cellInfo[m][i] = new CellInfo(csv[m][i]);
            }
        }
        // console.log(columnInfo);

        // delete the first row of the csv (header)
        csv = deleteRow(csv, 0);
        // console.log(csv);
        cellInfo = deleteRow(cellInfo, 0);
        console.log(cellInfo);

        // count int, double, boolean, string, empty for each column
        for (var i = 0; i < columnInfo.length; i++) {
            columnInfo[i].countDataTypes(getColumnFromArray (cellInfo, i));
        }

        // check results, set the data type of the column
        const numberOfRows = cellInfo.length;
        const numberOfColumns = columnInfo.length;

        for (var i = 0; i < columnInfo.length; i++) {
            var columnDatatype = "string";
            const numberOfNonEmptyCells = numberOfRows - columnInfo[i].emptyCount;
            const datatypeTreshold = numberOfNonEmptyCells * 0.8;
            // TODO numbers fiddling

            if (columnInfo[i].intCount >= datatypeTreshold) {
                if (columnInfo[i].doubleCount >= numberOfNonEmptyCells * 0.1) {
                    columnDatatype = "double";
                } else {
                    columnDatatype = "int";
                }
            } else if (columnInfo[i].doubleCount >= datatypeTreshold) {
                columnDatatype = "double";
            }
            if (columnInfo[i].booleanCount >= datatypeTreshold) {
                columnDatatype = "boolean";
            }

            columnInfo[i].setDatatype(columnDatatype);

            // change data types of the values
            if (columnInfo[i].datatype != "string") {

                for (var m = 0; m < cellInfo.length; m++) {

                    // change to int and double values from string
                    if (columnInfo[i].datatype === "int" ||
                            columnInfo[i].datatype === "double") {
                        cellInfo[m][i].cellValue = +cellInfo[m][i].cellValue;
                    } else { // boolean
                        // TODO maybe state, that the value was changed (0 => false), and visualize it in the table?
                        if (cellInfo[m][i].cellValue === "0" || cellInfo[m][i].cellValue.trim() === "false") {
                            cellInfo[m][i].cellValue = false;
                        } else if (cellInfo[m][i].cellValue === "1" || cellInfo[m][i].cellValue.trim() === "true") {
                            cellInfo[m][i].cellValue = true;
                        }
                    }
                }
            }
        }
        console.log(columnInfo);

        // now we can mark cells as faulty, if their datatype and the datatype of their column doesn't match
        for (var m = 0; m < cellInfo.length; m++) {

            for (var i = 0; i < cellInfo[m].length; i++) {
                if   ( (columnInfo[i].datatype === "int"     && !cellInfo[m][i].isInt)
                    || (columnInfo[i].datatype === "double"  && !cellInfo[m][i].isDouble)
                    || (columnInfo[i].datatype === "boolean" && !cellInfo[m][i].isBoolean) ){
                    cellInfo[m][i].isFaulty = true;
                    columnInfo[i].faultyCount++;
                }
            }
        }

        // prepend is used for inserting content at the beginning of an element
        // substring from after the last slash until the end
        $(".dc-data-count").children("h2").prepend(csvUrl.substring(csvUrl.lastIndexOf("/") + 1) + "; Rows: " + numberOfRows + ", Columns: " + numberOfColumns);
    }


    /**
     * creates charts (histograms for all columns), calculates statistics for each column,
     * creates a table with the data and renders everything
     */
    function generateCharts() {

        // collect important data for all columns
        // number of rows and columns, format of each column (string, double, etc.), deviation of values of numerical columns, length of strings, etc.
        for (var i = 0; i < columnInfo.length; i++) {
            calculateColumnStats(i);
        }

        // set crossfilter, set allDim (used for the table)
        ndx = crossfilter(cellInfo);
        allDim = ndx.dimension(function (d) { return d; });

        console.log(columnInfo);
        console.log(cellInfo);

        // create histograms for all columns
         for (var i = 0; i < columnInfo.length; i++) {
             createHistogramPlot(i);
         }

        // create covariance matrix
        // TODO

        // create multivarate/interesting plots
        // TODO

        // create the datatable
        createDataTable();

        // render all the charts
        dc.renderAll();

        // after the table is rendered, show a second scrollbar at the top of the table, if needed
        // jquery DoubleScroll plutin: https://github.com/avianey/jqDoubleScroll
        $('#dataTableWrapper').doubleScroll({resetOnWindowResize: true, onlyIfScroll: true});
    }


    /**
     * calculates stats for each column, the stats depend on the datatype of the column
     * @param {number} index
     */
    function calculateColumnStats (index) {

        var columnArray = getColumnPropertyFromObjectInArray(cellInfo, index, "cellValue");

        if (columnInfo[index].datatype === "int") {
            columnInfo[index] = new IntColumn(columnInfo[index], columnArray);
            setAndCountOutliers(index);
        } else if (columnInfo[index].datatype === "double") {
            columnInfo[index] = new DoubleColumn(columnInfo[index], columnArray);
            setAndCountOutliers(index);
        } else if (columnInfo[index].datatype === "boolean") {
            columnInfo[index] = new BooleanColumn(columnInfo[index], columnArray);
        } else if (columnInfo[index].datatype === "string") {
            columnInfo[index] = new StringColumn(columnInfo[index], columnArray);
        }
    }


    /**
     * after the statistics per column have been calculated, it can be decided if a value is an outlier
     * this function sets the outliers in cellInfo and the sum of outliers in columnInfo
     * @param {number} index
     */
    function setAndCountOutliers(index) {
        var sumOutliers = 0;

        for (var i = 0; i < cellInfo.length; i++) {
            if   ( cellInfo[i][index].cellValue < columnInfo[index].secondQuartile - 1.5 * columnInfo[index].iqr
                    || cellInfo[i][index].cellValue > columnInfo[index].secondQuartile + 1.5 * columnInfo[index].iqr ) {
                cellInfo[i][index].setIsOutlier(true);
                sumOutliers++;
            }
            else {
                cellInfo[i][index].setIsOutlier(false);
            }
        }

        columnInfo[index].setSumOutliers(sumOutliers);
    }


    /**
     * creates a histogram, from the column [index] of the csv-file
     * no return value needed, dc.barchart is initialized
     * @param {number} index
     */
    function createHistogramPlot (index) {
        // TODO kein histogramm machen wenn bei string werten 500 rows, 500 unique werte
        // TODO oder 500 rows 1 unique wert, sowohl bei int, boolean, als auch string
        // TODO oder wenn nur fehler rows (is derzeit ein bug)

        // create dimension & grouping (x- & y-values)
        var histogramDimension;
        var histogramGrouping;

        // init chart & table
        /* structure to create:
         <div class="col-xs-6 col-md-3">
             <div id="chartX-histogram">
                 <span class="resetContainer">
                     <a class="reset" href="#" onclick="histogramCharts[X].filterAll();dc.redrawAll();" style="display: none;">reset</a>
                     <span class="reset" style="display: none;"> <span class="filter"></span></span>
                 </span>
             </div>
         </div>*/

        // documentation: https://github.com/mbostock/d3/wiki/Selections
        var chartDivId = "chart" + index + "-histogram";

        if (elemsInHistogramRow >= 4) {
            var rowDiv = d3.select("#histograms").append("div")
                    .attr("class", "row");
            elemsInHistogramRow = 0;
        }

        var columnDiv = d3.select("#histograms>div:last-child").append("div")
                .attr("class", "col-xs-6 col-md-3");
        elemsInHistogramRow++;

        var chartDiv = columnDiv.append("div")
                .attr("id", chartDivId)
                .attr("class", "dc-chart");
        var resetContainer = chartDiv.append("span")
                .attr("class", "resetContainer");
        var aTag = resetContainer.append("a")
                .attr("class", "reset")
                .attr("href", "#")
                .attr("onclick", "histogramCharts[" + index + "].filterAll();dc.redrawAll();")
                .attr("style" , "display: none")
                .html("reset");

        var resetSpan = resetContainer.append("span")
                .attr("class", "reset")
                .attr("style", "display: none")
                .html(" ");
        resetSpan.append("span")
                .attr("class", "filter");
        resetSpan.append("br");


        histogramCharts[index] = dc.barChart("#" + chartDivId);

        var xScale, xUnits, roundFunction, orderingFunction, xAxisTickFormat;

        // check datatype of column, react accordingly
        if (columnInfo[index].datatype === "int" || columnInfo[index].datatype === "double") { // int or double

            // get the minimum and maximum value from the column
            // get the bin width (max - min) / 10
            // add half a bin to the lower and upper end
            // in the end, we have 11 bins

            var histogramBinWidth = Math.round((columnInfo[index].max - columnInfo[index].min) / 10);
            var histogramRange = [columnInfo[index].min - histogramBinWidth/2, columnInfo[index].max + histogramBinWidth/2];
            /*console.log("low: " + histogramRange[0]);
             console.log("high: " + histogramRange[1]);
             console.log("width: " + histogramBinWidth);*/

            // dimension = x-axis values => ranges
            histogramDimension = ndx.dimension(function(d) {
                return histogramRange[0] + (Math.floor((d[index].cellValue - histogramRange[0]) / histogramBinWidth) * histogramBinWidth);
            });

            // grouping = y-axis values => items grouped by histogram-parts, how many items per histogram-part?
            histogramGrouping = histogramDimension.group(); // by default reduceCount


            // setup some variables for the histogram
            var xScale = d3.scale.linear().domain(histogramRange);
            var xUnits = dc.units.fp.precision(histogramBinWidth);
            var roundFunction = function(d) { // with this command, only whole columns can be selected
                return histogramRange[0] + (Math.round((d - histogramRange[0]) / histogramBinWidth) * histogramBinWidth);
            };
            var orderingFunction = null;
            var xAxisTickFormat = d3.format("d");

        } else { // boolean or string => ordinal scale instead of linear scale

            // dimension = x-axis values => ranges
            if (columnInfo[index].datatype === "boolean") {
                histogramDimension = ndx.dimension(function (d) {
                    if (d[index].cellValue != true && d[index].cellValue != false) {
                        return "?"
                    }
                    else {
                        return d[index].cellValue
                    };
                });
            } else {
                histogramDimension = ndx.dimension(function (d) { return d[index].cellValue; });
            }

            // grouping = y-axis values => items grouped by histogram-parts, how many items per histogram-part?
            histogramGrouping = histogramDimension.group(); // by default reduceCount

            // setup some variables for the histogram
            var xScale = d3.scale.ordinal();
            var xUnits = dc.units.ordinal;
            var roundFunction = null;
            var orderingFunction = function(d) { return -d.value; } // order descending http://stackoverflow.com/questions/25204782/sorting-ordering-the-bars-in-a-bar-chart-by-the-bar-values-with-dc-js
            var xAxisTickFormat = "";
        }

        // fill chart
        histogramCharts[index]
                .width(300)
                .height(180)
                .margins({top: 25, right: 20, bottom: 35, left: 35})
                .centerBar(false)
                .elasticY(true)
                .dimension(histogramDimension)
                .group(histogramGrouping)
                .colors("#C11E1C")
                .x(xScale)
                .xUnits(xUnits) // x-axis precision = binWidth
                .renderHorizontalGridLines(true)
                .xAxisLabel(columnInfo[index].name)
                .yAxisLabel('count')
                .brushOn(true);

        if (roundFunction !== null) {
            histogramCharts[index].round(roundFunction)
        }
        if (orderingFunction !== null) {
            histogramCharts[index].ordering(orderingFunction)
        }


        // axis formatting https://github.com/mbostock/d3/wiki/Formatting
        // "d" = integer
        // 6 ticks @ y-axis
        var xAxisHistogramChart = histogramCharts[index].xAxis();
        xAxisHistogramChart.ticks(6).tickFormat(xAxisTickFormat);
        var yAxisHistogramChart = histogramCharts[index].yAxis();
        yAxisHistogramChart.ticks(6).tickFormat(d3.format("d")).tickSubdivide(0); // tickSubdivide(0) should remove sub ticks but not
    }


    /**
     * creates a data table, with full data
     * brushing and linking is enabled
     */
    function createDataTable() {
        // init the table
        var dataTable = dc.dataTable("#data-table");

        // create an array for the columns, consisting of label, format
        // documentation: http://dc-js.github.io/dc.js/docs/html/dc.dataTable.html#columns__anchor
        // a closure is needed: https://developer.mozilla.org/en/docs/Web/JavaScript/Closures#Creating_closures_in_loops_A_common_mistake
        var columnArray = [];
        for (var i = 0; i < columnInfo.length; i++) {
            columnArray[i] = {
                label: columnInfo[i].name,
                format: (function(i){ return function(d) {return d[i].cellValue;}; })(i)
            };
        }
        //console.log(columnArray);

        // fill the table
        dataTable
                .dimension(allDim)
                .group(function (d) {
                    return 'dc.js insists on putting a row here so I remove it using JS';
                })
                .size(100)
                .columns(columnArray)
                .sortBy(function(d) {return d[0].cellValue;}) // sort by the values of the first column
                //.order(d3.descending)
                .on('renderlet', function (table) {
                    // each time table is rendered remove nasty extra row dc.js insists on adding
                    table.select('tr.dc-table-group').remove();
                    /* change the header
                    var thElements = $('#data-table').children('th');
                    for (var i = 0; i < thElements.length; i++) {
                        thElements[i].firstChild.nodeValue = columnInfo[i].name;
                    }*/
                });

        // TODO: on renderlet formatting of the table: http://stackoverflow.com/questions/26657621/dc-js-datatable-custom-formatting => outliers, missing values etc
        // maybe also relevant: http://bl.ocks.org/jun9/raw/5631952/, http://stackoverflow.com/questions/25083383/custom-text-filter-for-dc-js-datatable
    }


    /**
     * deletes the row with rownumber [row] from the [array]
     * used eg. for deleting the first row (header), after extracting the data from it
     * @param {array} array
     * @param {number} row
     * @returns {array}
     */
    function deleteRow(array, row) {
        array = array.slice(0); // make copy
        array.splice(row, 1);
        return array;
    }


    /**
     * selects a column [index] from an array [array], and returns it
     * @param {array} array
     * @param {number} index
     * @returns {array}
     */
    function getColumnFromArray (array, index) {
        var column= [];
        for (var i = 0; i < array.length; i++) {
            column[i] = array[i][index];
        }
        return column;
    }

    /**
     * selects a column [index] from an array [array], and returns it
     * @param {array} array
     * @param {number} index
     * @returns {array}
     */
    function getColumnPropertyFromObjectInArray (array, index, property) {
        var column= [];
        for (var i = 0; i < array.length; i++) {
            column[i] = array[i][index][property];
        }
        return column;
    }
</script>
</body>
</html>

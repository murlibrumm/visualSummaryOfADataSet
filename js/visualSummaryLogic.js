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
// 2D-array with the data from the csv, inside each cell is a CellInfo-Object, extended with info about Datatypes
var cellInfo = [];
// 1D-array with info about each column, inside each cell is a ColumnInfo-Object
var columnInfo = [];
// 2D-array with the covariances of the columns
var correlationMatrix = [];
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
// colors for the histograms
var histogramColors = [];
// regular expressions, used for checking the datatype of each cell
const regexpInt = /^[\-]{0,1}[0-9]+$/;
const regexpDoubleComma = /^[\-]{0,1}[0-9]+[\,][0-9]+$/;
const regexpDoublePeriod = /^[\-]{0,1}[0-9]+[\.][0-9]+$/;
const regexpBoolean = /^(0|1|(true)|false){1}$/;



// ======================================= DOCUMENT READY FUNCTIONS =======================================
// when the document is ready (dom loaded), start with the parsing and chart-generating
// documentation: https://github.com/mbostock/d3/wiki/CSV

$().ready(function () {
    // check hidden input fields for the csv-parameters
    csvUrl = $("#csvTargetFile")[0].value;

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

    // initialize the histogramColorArray
    histogramColors["int"]     = "#8C3365";
    histogramColors["double"]  = "#33558C";
    histogramColors["string"]  = "#388C32";
    histogramColors["boolean"] = "#8C6F33";

    // parse each row from the csv-file
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
        const datatypeTresholdBoolean = numberOfNonEmptyCells * 0.9;
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
        if (columnInfo[i].booleanCount >= datatypeTresholdBoolean) {
            columnDatatype = "boolean";
        }

        // set the colum-data-type and the faulty flag
        columnInfo[i].setDatatype(columnDatatype);
        setFaultyFlag(i);

        // change data types of the values
        if (columnInfo[i].datatype != "string") {

            for (var m = 0; m < cellInfo.length; m++) {

                // change to int and double values from string
                if (!cellInfo[m][i].isEmpty && !cellInfo[m][i].isFaulty) {
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
    }
    console.log(columnInfo);

    // now we can mark cells as faulty, if their datatype and the datatype of their column doesn't match
    /*for (var i = 0; i < columnInfo.length; i++) {
        setFaultyFlag(i);
    }*/

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

    // create data-count-widget at the top of the page
    createDataCountWidget();

    console.log(columnInfo);
    console.log(cellInfo);

    // create histograms for all columns
    for (var i = 0; i < columnInfo.length; i++) {
        if (histogramMakesSense(i)) {
            createHistogramPlot(i);
        }
    }

    // create correlation matrix
    createCovarianceMatrix();
    console.log(correlationMatrix);

    // create multivarate/interesting plots
    // TODO

    // create the datatable
    createDataTable();

    // render all the charts
    dc.renderAll();

    // after the table is rendered, show a second scrollbar at the top of the table, if needed
    // jquery DoubleScroll plugin: https://github.com/avianey/jqDoubleScroll
    $('#dataTableWrapper').doubleScroll({resetOnWindowResize: true, onlyIfScroll: true});
}



/**
 * checks if it makes sense, to plot a histogram for the column [index]
 * @param {number} index
 */
function histogramMakesSense(index) {
    // don't plot histogram if:
    // 1) the row contains only faulty and empty values (valid for all datatypes)
    // 2) the row has only one unique value (valid for all datatypes)
    if (columnInfo[index].emptyCount + columnInfo[index].faultyCount == cellInfo.length ||
        columnInfo[index].uniqueValuesCount == 1) {
        return false;
    }
    // 3) the row has only unique values (valid for string only)
    if (columnInfo[index].datatype == "string" && columnInfo[index].uniqueValuesCount == cellInfo.length) {
        return false;
    }
    return true;
}


/**
 * creates the data-count-widget at the top of the page
 */
function createDataCountWidget() {
    var dataCount = dc.dataCount('#data-count');
    dataCount
        .dimension(ndx)
        .group(ndx.groupAll());

    // register handlers
    d3.selectAll('a#all').on('click', resetCharts());
}



/**
 * calculates the correlationMatrix, stores it in correlationMatrix
 */
function createCovarianceMatrix () {
    // save the 45 degree header and the rest of the table in 2 different variables
    // merge them to return the full html
    var htmlTopRow = "<tr><td class='correlationHead45'></td>";
    var html = "";
    for (var i = 0; i < columnInfo.length; i++) {
        // create the 45 degree header row (at the top), only double- or int-columns are allowed
        var columnIsNumberI = columnInfo[i].datatype == "int" || columnInfo[i].datatype == "double";
        if (columnIsNumberI) {
            htmlTopRow += "<td class='correlationHead45'><div><span>" + columnInfo[i].name + "</span></div></td>";
        }
        correlationMatrix[i] = [];

        for (var n = 0; n < columnInfo.length; n++) {
            // add the left column with columnnames, only double- or int-columns are allowed
            var columnIsNumberN = columnInfo[n].datatype == "int" || columnInfo[n].datatype == "double";
            if (n == 0 && columnIsNumberI) {
                html += "<tr><td class='correlationHead'>" + columnInfo[i].name + "</td>";
            }

            // calculate correlation if both are numbers, and if n > i (upper right triangle of the matrix)
            if (columnIsNumberN && columnIsNumberI) {
                if (n > i) {
                    correlationMatrix[i][n] = calculateCorrelation(i, n);
                    html += "<td class='correlationBody' style='background-color: " + getHSLColor(correlationMatrix[i][n]) + "'>" + correlationMatrix[i][n].toFixed(2) + "</td>";
                } else {
                    correlationMatrix[i][n] = null;
                    html += "<td class='correlationBody'></td>";
                }
            }
        }
        html += "</tr>";
    }
    htmlTopRow += "</tr>";

    $("#correlationTable")[0].innerHTML = htmlTopRow + html;
}


/**
 * HSL reference: http://www.ncl.ucar.edu/Applications/Images/colormap_6_3_lg.png
 * calculates the color based on the correlation of two values
 * @param {number} correlation, value between -1 and 1
 */
function getHSLColor(correlation) {
    // correlation is a value from -1 to 1
    // -1 = red   = 0   in HSL
    // +1 = green = 120 in HSL
    correlation += 1;
    // now:
    // 0 = red   = 0   in HSL
    // 2 = green = 120 in HSL
    var hue = (correlation * 60).toString(10);
    return ["hsl(",hue,",100%,50%)"].join("");
}


/**
 * calculates the correlationMatrix for two columns [i], [n]
 * @param {number} i
 * @param {number} n
 */
function calculateCorrelation(i, n) {
    var sum = 0;
    var sumNonFaultyPairs = 0;
    for (var row = 0; row < cellInfo.length; row++) {
        if (!cellInfo[row][i].isEmpty && !cellInfo[row][i].isFaulty && !cellInfo[row][n].isEmpty && !cellInfo[row][n].isFaulty) {
            sumNonFaultyPairs++;
            sum += (cellInfo[row][i].cellValue - columnInfo[i].average) * (cellInfo[row][n].cellValue - columnInfo[n].average);
        }
    }
    // correlation_i,n = covariance_i,n / sqrt ( variance_i * variance_n )
    return ( sum / sumNonFaultyPairs ) / Math.sqrt ( Math.pow(columnInfo[i].deviation, 2) * Math.pow(columnInfo[n].deviation, 2) );
}



/**
 * calculates stats for each column, the stats depend on the datatype of the column
 * @param {number} index
 */
function calculateColumnStats (index) {

    // then calculate the statistics per column
    var columnArray = getColumnPropertyFromObjectInArray(cellInfo, index, "cellValue", false);

    if (columnInfo[index].datatype === "int") {
        columnInfo[index] = new IntColumn(columnInfo[index], columnArray);
    } else if (columnInfo[index].datatype === "double") {
        columnInfo[index] = new DoubleColumn(columnInfo[index], columnArray);
    } else if (columnInfo[index].datatype === "boolean") {
        columnInfo[index] = new BooleanColumn(columnInfo[index], columnArray);
    } else if (columnInfo[index].datatype === "string") {
        columnInfo[index] = new StringColumn(columnInfo[index], columnArray);
    }

    // then set the outlier-flag
    if (columnInfo[index].datatype === "int" || columnInfo[index].datatype === "double") {
        setAndCountOutliers(index);
    }
}



/**
 * calcluates if the values from column [i] are faulty
 * @param {number} index
 */
function setFaultyFlag(index) {
    for (var i = 0; i < cellInfo.length; i++) {

        if (!cellInfo[i][index].isEmpty) {

            if (columnInfo[index].datatype == "int" &&
                cellInfo[i][index].isInt == false) {
                cellInfo[i][index].setIsFaulty(true);
                columnInfo[index].faultyCount++;

            } else if (columnInfo[index].datatype == "double" &&
                cellInfo[i][index].isInt == false && cellInfo[i][index].isDouble == false) {
                cellInfo[i][index].setIsFaulty(true);
                columnInfo[index].faultyCount++;

            } else if (columnInfo[index].datatype == "boolean" &&
                cellInfo[i][index].isBoolean == false) {
                cellInfo[i][index].setIsFaulty(true);
                columnInfo[index].faultyCount++;
            }
        }
    }
}


/**
 * after the statistics per column have been calculated, it can be decided if a value is an outlier
 * this function sets the outliers in cellInfo and the sum of outliers in columnInfo
 * @param {number} index
 */
function setAndCountOutliers(index) {
    var outlierCount = 0;

    // calculation of outliers: mean +- 2s or robust: median +- 1.5iqr
    for (var i = 0; i < cellInfo.length; i++) {
        if   ( !cellInfo[i][index].isFaulty && !cellInfo[i][index].isEmpty &&
              (cellInfo[i][index].cellValue < columnInfo[index].firstQuartile - 1.5 * columnInfo[index].iqr
            || cellInfo[i][index].cellValue > columnInfo[index].thirdQuartile + 1.5 * columnInfo[index].iqr )) {
            cellInfo[i][index].setIsOutlier(true);
            outlierCount++;
        }
        else {
            cellInfo[i][index].setIsOutlier(false);
        }
    }

    columnInfo[index].setOutlierCount(outlierCount);
}


/**
 * creates a histogram, from the column [index] of the csv-file
 * no return value needed, dc.barchart is initialized
 * @param {number} index
 */
function createHistogramPlot (index) {
    /* structure to create for each histogram:
     <div class="col-xs-6 col-lg-3">
         <div id="chartX-histogram">
             <span class="resetContainer">
                 <a class="reset" href="#" onclick="histogramCharts[X].filterAll();dc.redrawAll();" style="display: none;">reset</a>
                 <span class="reset" style="display: none;"> <span class="filter"></span></span>
             </span>
         </div>
     </div>*/

    // documentation: https://github.com/mbostock/d3/wiki/Selections
    var chartDivId = "chart" + index + "-histogram";

    // add a new row, if  we added more than 4 elements (4 elements per row)
    if (elemsInHistogramRow >= 4) {
        d3.select("#histograms").append("div")
            .attr("class", "row");
        elemsInHistogramRow = 0;
    }

    var columnDiv = d3.select("#histograms>div:last-child").append("div")
        .attr("class", "col-xs-6 col-lg-3");
    elemsInHistogramRow++;

    var chartDiv = columnDiv.append("div")
        .attr("id", chartDivId)
        .attr("class", "dc-chart");
    var resetContainer = chartDiv.append("span")
        .attr("class", "resetContainer");
    resetContainer.append("a")
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

    // add the new div to the histogramCharts-array
    histogramCharts[index] = dc.barChart("#" + chartDivId);

    // create dimension & grouping (x- & y-values)
    var histogramDimension;
    var histogramGrouping;

    var xScale, xUnits, roundFunction, orderingFunction, hideXAxisText;

    // check datatype of column, react accordingly
    if (columnInfo[index].datatype === "int" || columnInfo[index].datatype === "double") { // int or double

        // get the minimum and maximum value from the column
        // get the bin width (max - min) / 10
        // add half a bin to the lower and upper end
        // in the end, we have 11 bins

        // TODO Freedman Diaconis bin-width

        var histogramBinWidth = (columnInfo[index].max - columnInfo[index].min) / 10;
        if (columnInfo[index].datatype == "int") {
            histogramBinWidth = Math.round(histogramBinWidth);
        }

        var histogramRange = [columnInfo[index].min - histogramBinWidth/2, columnInfo[index].max + histogramBinWidth/2];
        /*console.log("low: " + histogramRange[0]);
         console.log("high: " + histogramRange[1]);
         console.log("width: " + histogramBinWidth);*/

        // dimension = x-axis values => ranges
        histogramDimension = ndx.dimension(function(d) {
            if (d[index].isEmpty || d[index].isFaulty) {
                return -Infinity;
            } else {
                // rounds all the values to the low-threshold of the bin they fit in
                return histogramRange[0] + (Math.floor((d[index].cellValue - histogramRange[0]) / histogramBinWidth) * histogramBinWidth);
            }
        });

        // grouping = y-axis values => items grouped by histogram-parts, how many items per histogram-part?
        histogramGrouping = histogramDimension.group(); // by default reduceCount

        // setup some variables for the histogram
        xScale = d3.scale.linear().domain(histogramRange);
        xUnits = dc.units.fp.precision(histogramBinWidth);
        roundFunction = function(d) { // with this command, only whole columns can be selected
            return histogramRange[0] + (Math.round((d - histogramRange[0]) / histogramBinWidth) * histogramBinWidth);
        };
        orderingFunction = null;
        hideXAxisText = false;

    } else { // boolean or string => ordinal scale instead of linear scale

        // dimension = x-axis values
        if (columnInfo[index].datatype === "boolean") {
            histogramDimension = ndx.dimension(function (d) {
                if (d[index].cellValue != true && d[index].cellValue != false) {
                    return "faulty cell";
                }
                else {
                    return d[index].cellValue;
                }
            });
        } else {
            histogramDimension = ndx.dimension(function (d) {
                if (d[index].isEmpty) {
                    return "empty cell";
                } else if (d[index].isFaulty) {
                    return "fautly cell";
                } else {
                    return d[index].cellValue;
                }
            });

        }

        // grouping = y-axis values => items grouped by histogram-parts, how many items per histogram-part?
        histogramGrouping = histogramDimension.group(); // by default reduceCount

        // setup some variables for the histogram
        xScale = d3.scale.ordinal();
        xUnits = dc.units.ordinal;
        roundFunction = null;
        orderingFunction = function(d) { return -d.value; }; // order descending http://stackoverflow.com/questions/25204782/sorting-ordering-the-bars-in-a-bar-chart-by-the-bar-values-with-dc-js
        hideXAxisText = true;
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
        .colors(histogramColors[columnInfo[index].datatype])
        .x(xScale)
        .xUnits(xUnits) // x-axis precision = binWidth
        .renderHorizontalGridLines(true)
        .xAxisLabel(columnInfo[index].name)
        .yAxisLabel('count')
        .brushOn(true)
        // use renderlet to "escape" to d3, see: http://dc-js.github.io/dc.js/examples/bar-extra-line.html
        .on('renderlet', function(chart) {
            // we don't want the renderlet to be active everytime a selection is resetted
            // if there was no "Reset All" button, renderlet could be removed at the end of the renderlet => chart.on('renderlet', null);
            // so we have to check, if the custom classname we set (renderletAdded) still exists, and redraw tooltip & lines only if necessary
            if ( ! chart.select('.renderletAdded').empty() ) {
                return;
            }

            // only draw stuff if it is a int or double histogram
            if (columnInfo[index].datatype == "int" || columnInfo[index].datatype == "double") {
                chart.select('g.chart-body').classed("renderletAdded", true);

                var colorMedian = "#53d900";
                var colorQuartiles = "#92d966";
                var colorOutlierLine = "#bbb";
                var colorOutlierRect = "#eee";
                drawHistogramLine(chart, columnInfo[index].secondQuartile, colorMedian);
                drawHistogramLine(chart, columnInfo[index].firstQuartile,  colorQuartiles);
                drawHistogramLine(chart, columnInfo[index].thirdQuartile,  colorQuartiles);

                var outlierLeftThreshold  = columnInfo[index].firstQuartile - ( 1.5 * columnInfo[index].iqr );
                var outlierRightThreshold = columnInfo[index].thirdQuartile + ( 1.5 * columnInfo[index].iqr );
                drawHistogramLine(chart, outlierLeftThreshold,  colorOutlierLine);
                drawHistogramLine(chart, outlierRightThreshold, colorOutlierLine);

                var height = chart.y().range()[0] - chart.y().range()[1];
                drawHistogramRect(chart, {'x': 0, 'y': 0},
                    chart.x()(outlierLeftThreshold), height, colorOutlierRect);
                drawHistogramRect(chart, {'x': chart.x()(outlierRightThreshold), 'y': 0},
                    chart.x().range()[1] - chart.x()(outlierRightThreshold), height, colorOutlierRect);
            }

            if (columnInfo[index].datatype == "string") {
                chart.select('g.chart-body').classed("renderletAdded", true);

                // Initialize tooltip
                var tip = d3.tip().attr('class', 'd3-tip')
                    .offset([-10, 0])
                    .html(function(d) { return d.x; });

                // Invoke the tip in the context of this histogram
                chart.selectAll('rect').call(tip);

                chart.selectAll('rect')
                    .on('mouseover', tip.show)
                    .on('mouseout', tip.hide);
            }
        });

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
    if (hideXAxisText) {
        xAxisHistogramChart.tickFormat("");
    }
    xAxisHistogramChart.ticks(5);
    var yAxisHistogramChart = histogramCharts[index].yAxis();
    yAxisHistogramChart.ticks(6).tickFormat(d3.format("d")).tickSubdivide(0); // tickSubdivide(0) should remove sub ticks but not
}



/**
 * adds a vertical line at the position [xCoord] to the [chart], with color: [color]
 * @param {object} chart
 * @param {number} xCoord
 * @param {string} color
 */
function drawHistogramLine(chart, xCoord, color) {
    var extra_data = [{x: chart.x()( xCoord ), y: chart.y().range()[0]},
                      {x: chart.x()( xCoord ), y: chart.y().range()[1]}];
    var line = d3.svg.line()
        .x(function(d) { return d.x; })
        .y(function(d) { return d.y; })
        .interpolate('linear');
    // insert as last-child, so that the line is infront of the barchart
    var path = chart.select('g.chart-body').append('path').attr('class', 'extra').attr('stroke', color).attr('stroke-width', '3').data([extra_data]);
    path.attr('d', line);
}



/**
 * adds a rect from the starting point [p] to the [chart], with width: [width], height: [height], color: [color]
 * @param {object} chart
 * @param {object} p
 * @param {number} width
 * @param {number} height
 * @param {string} color
 */
function drawHistogramRect(chart, p, width, height, color) {
    // Draw the Rectangle, only if width > 0
    if ( width > 0 ) {
        // insert as first-child, so that the rectangle is behind the barchart
        chart.select('g.chart-body').insert("rect", ":first-child")
            .attr("x", p['x'])
            .attr("y", p['y'])
            .attr("width",  width)
            .attr("height", height)
            .attr("fill", color);
    }
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
            label: "<div class='columnName'>" + columnInfo[i].name + "</div><hr class='hrTable' />",
            format: (function(i){ return function(d) {
                var cssClasses =
                    "cellId" + d[i].cellId +
                    ((d[i].isFaulty) ? " faultyValue" : "") +
                    ((d[i].isEmpty) ? " emptyValue" : "") +
                    ((d[i].isOutlier) ? " outlierValue" : "");
                if (cssClasses != "") {
                    cssClasses = " class='" + cssClasses + "'";
                }

                var value = (d[i].isEmpty) ? "&nbsp;" : d[i].cellValue;

                return "<div" + cssClasses + ">" + value + "</div>";
            }; }(i))
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

            // on renderlet formatting of the table: http://stackoverflow.com/questions/26657621/dc-js-datatable-custom-formatting => outliers, missing values etc
            // maybe also relevant: http://bl.ocks.org/jun9/raw/5631952/, http://stackoverflow.com/questions/25083383/custom-text-filter-for-dc-js-datatable


            $('.dc-table-head').each(function (index, element) {
                // 1) add info-button + datatype to the header
                d3.select(element).append("span")
                    .attr("class", "columnDatatype")
                    .html(columnInfo[index].datatype);
                d3.select(element).append("div")
                    .attr("class", "columnInfo")
                    .attr("onclick", "javascript:showColumnStatistics(" + index + ")");

                // 2) add "composition-bar" to the header
                var columnComposition = d3.select(element).append("div")
                    .attr("class", "columnComposition");

                var validCount = cellInfo.length - columnInfo[index].emptyCount - columnInfo[index].faultyCount;
                columnComposition.append("div")
                    .attr("class", "columnCompositionValid")
                    .attr("style", "width: " + (validCount / cellInfo.length) * 100 + "%;")
                    .attr("data-toggle", "tooltip")
                    .attr("title", "valid: " + validCount);
                columnComposition.append("div")
                    .attr("class", "columnCompositionEmpty")
                    .attr("style", "width: " + (columnInfo[index].emptyCount / cellInfo.length) * 100 + "%;")
                    .attr("data-toggle", "tooltip")
                    .attr("title", "empty: " + columnInfo[index].emptyCount);
                columnComposition.append("div")
                    .attr("class", "columnCompositionFaulty")
                    .attr("style", "width: " + (columnInfo[index].faultyCount / cellInfo.length) * 100 + "%;")
                    .attr("data-toggle", "tooltip")
                    .attr("title", "faulty: " + columnInfo[index].faultyCount);
            });

            // add a tooltip to the "composition-bar"
            $('[data-toggle="tooltip"]').tooltip({
                animated : 'fade',
                placement : 'bottom',
                container: 'body'
            });


            // add an extra column to the table, for manual filtering of rows
            // 1) add a cell to the header with the controls
            var controlCell = d3.select('#data-table thead tr').insert("th", ":first-child")
                .attr("class", "dc-table-head tableHeadFilter");
            var innerDiv = controlCell.append("div")
                .attr("class", "columnName");

            innerDiv.append("a")
                .attr("href", "javascript: filterAllCharsAndTable();")
                .attr("class", "filterLink")
                .html("filter rows!");
            innerDiv.append("br");
            innerDiv.append("a")
                .attr("href", "javascript: resetCharts();")
                .attr("class", "filterLink")
                .html("reset all!");

            // 2) add a cell to each row with a checkbox
            $('.dc-table-row').each(function (index, element) {
                // get the id from the first column of the row
                var cellId = element.firstChild.firstChild.className.substring(6);
                // add a checkbox in the new first column
                var tdElement = d3.select(element).insert("td", ":first-child")
                    .attr("class", "dc-table-column")
                    .attr("align", "center");
                tdElement.append("div").append("input")
                    .attr("type", "checkbox")
                    .attr("class", "filterRowsCheckbox")
                    .attr("value", cellId);
            });
        });
}


/**
 * deletes the row with rownumber [row] from the [array]
 * used eg. for deleting the first row (header), after extracting the data from it
 * @param {Array} array
 * @param {number} row
 * @returns {Array}
 */
function deleteRow(array, row) {
    array = array.slice(0); // make copy
    array.splice(row, 1);
    return array;
}


/**
 * selects a column [index] from an array [array], and returns an array
 * @param {Array} array
 * @param {number} index
 * @returns {Array}
 */
function getColumnFromArray (array, index) {
    var column= [];
    for (var i = 0; i < array.length; i++) {
        column[i] = array[i][index];
    }
    return column;
}

/**
 * selects all [property]s from an object of a column [index] from an array [array], and returns them as an array
 * @param {Array} array
 * @param {number} index
 * @param {string} property
 * @param {boolean} includeFaultyEmptyValues
 * @returns {Array}
 */
function getColumnPropertyFromObjectInArray (array, index, property, includeFaultyEmptyValues) {
    var column= [];
    for (var i = 0; i < array.length; i++) {
        if (includeFaultyEmptyValues || (!array[i][index]['isFaulty'] && !array[i][index]['isEmpty'])) {
            column.push(array[i][index][property]);
        }
    }
    return column;
}



// ======================================= ONCLICK FUNCTIONS =======================================
/**
 * displays the statitical information for a column in a div
 * @param {number} index
 */
function showColumnStatistics (index) {
    closeCorrelationMatrix();
    var html = columnInfo[index].createStatistics();
    var statisticsDiv = $("#columnStatistics")[0];
    statisticsDiv.innerHTML = html;
    statisticsDiv.style.display = "block";
}

/**
 * closes the column-statitical-information-div
 */
function closeColumnStatistics () {
    var statisticsDiv = $("#columnStatistics")[0];
    statisticsDiv.style.display = "none";
}

/**
 * displays the correlation-matrix-div
 */
function showCorrelationMatrix () {
    closeColumnStatistics();
    var correlationDiv = $("#correlationDiv")[0];
    correlationDiv.style.display = "block";
}

/**
 * closes the correlation-matrix-div
 */
function closeCorrelationMatrix () {
    var correlationDiv = $("#correlationDiv")[0];
    correlationDiv.style.display = "none";
}

function resetCharts() {
    dc.filterAll();
    dc.renderAll();
}

/**
 * manual filtering:
 * only show rows with corresponding checked checkboxes
 */
function filterAllCharsAndTable() {
    // create array of ids of cells, which should still be visible
    // to do this, iterate over all checkboxes from the first column of the table
    var filterValues = [];
    $(".filterRowsCheckbox").each(function (index, element) {
        console.log(element.checked);
        console.log(element);
        if(element.checked) {
            // + before the value to change the type to number
            filterValues.push(+element.value);
        }
    });
    // don't filter if there aren't any checkboxes checked
    if (filterValues.length == 0) {
        return;
    }

    // show only rows where the first column id exists in the filterValues-array
    allDim.filter(function(d){
        return filterValues.indexOf(d[0].cellId) > -1;
    });

    dc.redrawAll();
}
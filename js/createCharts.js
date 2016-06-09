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
    if (columnInfo[index].validCount == 0 ||
        columnInfo[index].uniqueValuesCount == 1) {
        return false;
    }
    // 3) the row has only unique values (valid for string only)
    if (columnInfo[index].datatype == "string" && columnInfo[index].uniqueValuesCount == columnInfo[index].validCount) {
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
    d3.selectAll('a#all').attr('href', 'javascript:resetCharts()');
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

        // Freedman & Diaconis bin-width
        var histogramBinWidth = (2 * columnInfo[index].iqr) / (Math.pow(columnInfo[index].validCount, 1/3));

        var numberOfBars, histogramRange;

        if (columnInfo[index].datatype === "int") { // int, ranges start at floating-point-numbers with 0.5
            if ((columnInfo[index].max - columnInfo[index].min) <= 10) { // if the max-min-diff is lte 10, the bin-width is 1
                histogramBinWidth = 1;
                histogramRange = [columnInfo[index].min - 0.5, columnInfo[index].max + 0.5];
                // numberOfBars = histogramRange[1] - histogramRange[0];

            } else { // if the max-min-diff is gt 10, the bin-width is calculated
                var minimumMinMaxDiff = columnInfo[index].max + 1 - columnInfo[index].min;

                histogramBinWidth = Math.round(histogramBinWidth);
                // round the number of bars (round upwards)
                numberOfBars =  Math.ceil(minimumMinMaxDiff / histogramBinWidth);

                // calculate range
                var differenceBinWidthMinMax = (numberOfBars * histogramBinWidth) - minimumMinMaxDiff;
                var startPoint = columnInfo[index].min - 0.5 - (differenceBinWidthMinMax / 2);
                var endPoint = columnInfo[index].max + 0.5 + (differenceBinWidthMinMax / 2);

                // if the startPoint is a decimal number, the endPoint is also a decimal number, increase both by 0.5
                if (startPoint % 1 != 0) {
                    startPoint += 0.5;
                    endPoint += 0.5;
                }
                histogramRange = [startPoint, endPoint];
            }

        } else { // double
            // round the number of bars (round upwards)
            numberOfBars =  Math.ceil((columnInfo[index].max - columnInfo[index].min) / histogramBinWidth);
            histogramBinWidth = (columnInfo[index].max - columnInfo[index].min) / numberOfBars;
            histogramRange = [columnInfo[index].min, columnInfo[index].max];
        }


        // dimension = x-axis values => ranges
        histogramDimension = ndx.dimension(function(d) {
            if (d[index].isEmpty || d[index].isFaulty) {
                return -Infinity;
            } else {
                // rounds all the values to the low-threshold of the bin they fit in
                // in case of the maximum-value of a double column, lower the value just a slight bit, so it fits into the last column
                var value = d[index].cellValue;
                if (columnInfo[index].datatype === "double" && d[index].cellValue == histogramRange[1]) {
                    value -= (value - histogramRange[0]) / 1000;
                }
                return histogramRange[0] + (Math.floor((value - histogramRange[0]) / histogramBinWidth) * histogramBinWidth);
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

            // only draw stuff if it is a int- or double-histogram
            if (columnInfo[index].datatype == "int" || columnInfo[index].datatype == "double") {
                chart.select('g.chart-body').classed("renderletAdded", true);

                var colorMedian = "#000";
                var colorQuartiles = "#000";
                var colorOutlierLine = "#bbb";
                var colorOutlierRect = "#eee";
                drawHistogramLine(chart, columnInfo[index].secondQuartile, colorMedian, 2);
                drawHistogramLine(chart, columnInfo[index].firstQuartile,  colorQuartiles, 2);
                drawHistogramLine(chart, columnInfo[index].thirdQuartile,  colorQuartiles, 2);

                var outlierLeftThreshold  = columnInfo[index].firstQuartile - ( 1.5 * columnInfo[index].iqr );
                var outlierRightThreshold = columnInfo[index].thirdQuartile + ( 1.5 * columnInfo[index].iqr );
                drawHistogramLine(chart, outlierLeftThreshold,  colorOutlierLine, 1);
                drawHistogramLine(chart, outlierRightThreshold, colorOutlierLine, 1);

                var height = chart.y().range()[0] - chart.y().range()[1];
                drawHistogramRect(chart, {'x': 0, 'y': 0},
                    chart.x()(outlierLeftThreshold), height, colorOutlierRect);
                drawHistogramRect(chart, {'x': chart.x()(outlierRightThreshold), 'y': 0},
                    chart.x().range()[1] - chart.x()(outlierRightThreshold), height, colorOutlierRect);
            }

            // in case of a string-histogram add tooltips
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
function drawHistogramLine(chart, xCoord, color, width) {
    var extra_data = [{x: chart.x()( xCoord ), y: chart.y().range()[0]},
                      {x: chart.x()( xCoord ), y: chart.y().range()[1]}];
    var line = d3.svg.line()
        .x(function(d) { return d.x; })
        .y(function(d) { return d.y; })
        .interpolate('linear');
    // insert as last-child, so that the line is infront of the barchart
    var path = chart.select('g.chart-body').append('path').attr('class', 'extra').attr('stroke', color).attr('stroke-width', width).data([extra_data]);
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

                columnComposition.append("div")
                    .attr("class", "columnCompositionValid")
                    .attr("style", "width: " + (columnInfo[index].validCount / cellInfo.length) * 100 + "%;")
                    .attr("data-toggle", "tooltip")
                    .attr("title", "valid: " + columnInfo[index].validCount);
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
                    .attr("class", "dc-table-column filterColumn")
                    .attr("align", "center");
                tdElement.append("div").append("input")
                    .attr("type", "checkbox")
                    .attr("class", "filterRowsCheckbox")
                    .attr("value", cellId);
            });
        });
}
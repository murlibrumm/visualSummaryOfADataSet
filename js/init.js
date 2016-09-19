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
    histogramColors["int"]     = "#a6cee3";
    histogramColors["double"]  = "#1f78b4";
    histogramColors["string"]  = "#33a02c";
    histogramColors["boolean"] = "#b2df8a";

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
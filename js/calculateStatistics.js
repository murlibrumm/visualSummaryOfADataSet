/**
 * calculates the correlationMatrix, stores it in correlationMatrix
 */
function createCovarianceMatrix () {
    // save the 45 degree header and the rest of the table in 2 different variables
    // merge them to return the full html
    var htmlTopRow = "<tr><th class='correlationHead45'></th>";
    var html = "";
    for (var i = 0; i < columnInfo.length; i++) {
        // create the 45 degree header row (at the top), only double- or int-columns are allowed
        var columnIsNumberI = columnInfo[i].datatype == "int" || columnInfo[i].datatype == "double";
        if (columnIsNumberI) {
            htmlTopRow += "<th class='correlationHead45'><div><span>" + columnInfo[i].name + "</span></div></th>";
        }
        correlationMatrix[i] = [];

        for (var n = 0; n < columnInfo.length; n++) {
            // add the left column with columnnames, only double- or int-columns are allowed
            var columnIsNumberN = columnInfo[n].datatype == "int" || columnInfo[n].datatype == "double";
            if (n == 0 && columnIsNumberI) {
                html += "<tr><th class='correlationHead'>" + columnInfo[i].name + "</th>";
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

    $("#correlationTable")[0].innerHTML = "<thead>" + htmlTopRow + "</thead><tbody>" + html + "</tbody>";
    addHoverSelection();
    createCorrelationInfo();
}

function createCorrelationInfo () {
    var html = "";
    for (var i = -1; i <= 1; ) {
        html += "<div class='correlationInfoBox' style='background-color: " + getHSLColor(i) + "'>" + i + "</div>";
        i = parseFloat((i + 0.2).toFixed(2));
    }
    $("#correlationDiv .correlationInfoLegend")[0].innerHTML = html;
}

/**
 * function for highlighting the border of cells, which are vertically on the same level
 * adds "listener" to td and th elements on mouseenter and mouseleave
 * the listener adds respectively removes the class active from the vertical columns
 * code adapted from http://stackoverflow.com/questions/13712868/change-column-background-color-on-hover
 */
function addHoverSelection () {
    // Place outside hover function for performance reasons
    var correlationDiv = $('#correlationTable');
    var correlationDivHead = $('#correlationTable thead');
    var correlationDivTd = $("#correlationTable td, #correlationTable th");

    correlationDiv.on("mouseenter", "td", function() {
        // Position of hovered column within this row
        var thisIndex = $(this).parents('tr').find('td').index($(this));

        // Add active class to all columns that have the same index as the hovered one + 1 for the index difference, and + 1 for the th-elements
        $('#correlationTable tr    td:nth-child(' + (thisIndex + 1 + 1) + ')').addClass('active');
        $('#correlationTable thead th:nth-child(' + (thisIndex + 1 + 1) + ')').addClass('active');

        // Remove active class when mouse leaves a cell
    }).on('mouseleave', "td", function () {
        correlationDivTd.removeClass('active');
    });

    correlationDivHead.on("mouseenter", "div", function() {
        // Position of hovered column within this row
        var thisIndex = $(this).parents('tr').find('th').index($(this).parent());

        // the first index is ignored (first cell in the first row is always empty)
        if(thisIndex != 0) {
            // Add active class to all columns that have the same index as the hovered one + 1 for the index difference
            $('#correlationTable tr    td:nth-child(' + (thisIndex + 1) + ')').addClass('active');
            $('#correlationTable thead th:nth-child(' + (thisIndex + 1) + ')').addClass('active');
        }

        // Remove active class when mouse leaves a cell
    }).on('mouseleave', "div", function () {
        correlationDivTd.removeClass('active');
    });

}


/**
 * calculates the color based on the correlation of two values
 * @param {number} correlation, value between -1 and 1
 */
function getHSLColor(correlation) {
    /*
    NON COLORBLIND FRIENDLY VERSION
     HSL reference: http://www.ncl.ucar.edu/Applications/Images/colormap_6_3_lg.png
    // correlation is a value from -1 to 1
    // -1 = red   = 0   in HSL
    // +1 = green = 120 in HSL
    correlation += 1;
    // now:
    // 0 = red   = 0   in HSL
    // 2 = green = 120 in HSL
    var hue = (correlation * 60).toString(10);
    return ["hsl(",hue,",100%,50%)"].join(""); */



    /*
    COLORBLIND VERSION #1
    // http://stackoverflow.com/questions/5623838/rgb-to-hex-and-hex-to-rgb
    // colorblind safe colors from http://colorbrewer2.org/#type=diverging&scheme=PuOr&n=3

    // F1A340 = (RGB) 241 163 64  (orange)
    // 998EC3 = (RGB) 153 142 195 (violet)
    // diff   = (RGB) -88 -19 131
    // correlation is a value from -1 to 1, for my calculations I want it to be 0 to 2
    correlation += 1;
    var r = Math.round(241 - (correlation * (88  / 2)));
    var g = Math.round(163 - (correlation * (19  / 2)));
    var b = Math.round(64  + (correlation * (131 / 2)));

    return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);*/



    /*// COLORBLIND VERSION #2
    // http://stackoverflow.com/questions/5623838/rgb-to-hex-and-hex-to-rgb
     // colorblind safe colors from http://colorbrewer2.org/#type=diverging&scheme=PuOr&n=3

     // e9a3c9 = (RGB) 233 163 201 (pink)
     // a1d76a = (RGB) 161 215 106 (light green)
     // diff   = (RGB) -72 52  -95
     // correlation is a value from -1 to 1, for my calculations I want it to be 0 to 2
     correlation += 1;
     var r = Math.round(233 - (correlation * (72 / 2)));
     var g = Math.round(163 + (correlation * (52 / 2)));
     var b = Math.round(201 - (correlation * (95 / 2)));

     return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);*/


    // COLORBLIND VERSION #3
    // http://stackoverflow.com/questions/5623838/rgb-to-hex-and-hex-to-rgb
    // colorblind safe colors from http://colorbrewer2.org/#type=diverging&scheme=PuOr&n=3

    // e9a3c9 = (HSB)  327  30 91 (pink)
    // a1d76a = (HSB)   90  51 84 (light green)
    // diff   = (HSB) -237  21 -7
    // correlation is a value from -1 to 1, for my calculations I want it to be 0 to 2
    correlation += 1;

    var h = 327 - (correlation * (237 / 2)).toString(10);
    var s =  30 + (correlation * ( 51 / 2)).toString(10);
    var b =  91 - (correlation * (  7 / 2)).toString(10);
    return ["hsl(", h, ",", s, "%,", b, "%)"].join("");

}

/**
 * Converts an integer value to a hex value
 * @param {Number} c
 * @returns {String}
 */
function componentToHex(c) {
    var hex = c.toString(16);
    return hex.length == 1 ? "0" + hex : hex;
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
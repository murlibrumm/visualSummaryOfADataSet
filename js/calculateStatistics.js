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
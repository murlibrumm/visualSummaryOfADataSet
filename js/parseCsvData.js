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

    // substring from after the last slash until the end
    $(".dc-data-count .file-info-file").html(csvUrl.substring(csvUrl.lastIndexOf("/") + 1));
    $(".dc-data-count .file-info-rows").html(numberOfRows);
    $(".dc-data-count .file-info-columns").html(numberOfColumns);
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

    columnInfo[index].validCount = cellInfo.length - columnInfo[index].faultyCount - columnInfo[index].emptyCount;
}
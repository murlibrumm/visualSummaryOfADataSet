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
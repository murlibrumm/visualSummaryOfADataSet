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

/**
 * reset all filters & render everything
 */
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
    // documentation: https://github.com/square/crossfilter/wiki/API-Reference#dimension_filter
    allDim.filter(function(d){
        return filterValues.indexOf(d[0].cellId) > -1;
    });

    dc.redrawAll();
}
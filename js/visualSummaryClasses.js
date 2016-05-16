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
    this.isOutlier = false;

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
};


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
    } else { // columnInfo
        // console.log(arguments[0]);
        this.name = arguments[0].name;
        this.intCount = arguments[0].intCount;
        this.doubleCount = arguments[0].doubleCount;
        this.booleanCount = arguments[0].booleanCount;
        this.emptyCount = arguments[0].emptyCount;
        this.faultyCount = arguments[0].faultyCount;
        this.datatype = arguments[0].datatype;
    }
}

/**
 * counts the int, double, boolean, empty values in the array (the array must contain CellInfo-objects)
 * @param {Array} array
 */
ColumnInfo.prototype.countDataTypes = function (array) {
    for (var i = 0; i < array.length; i++) {
        if (array[i].isInt)     this.intCount++;
        if (array[i].isDouble)  this.doubleCount++;
        if (array[i].isBoolean) this.booleanCount++;
        if (array[i].isEmpty)   this.emptyCount++;
    }
};

/**
 * setter for datatype
 * @param {string} datatype
 */
ColumnInfo.prototype.setDatatype = function (datatype) {
    this.datatype = datatype;
};

const closeButton = "<div class='closeInformationDiv'>[<a href='javascript:closeColumnStatistics()'> x </a>]</div>";
const divRowStart = "<div class='row'>";
const divColumnStartTitle = "<div class='col-xs-12 col-stat-title'>";
const divColumnStartKey = "<div class='col-xs-7 col-stat-key'>";
const divColumnStartValue = "<div class='col-xs-5 col-stat-value'>";
const divEnd ="</div>";
const hrSeparator = "<hr class='hrTable' />";

/**
 * generates html statistics for the column
 * @return {html}
 */
ColumnInfo.prototype.createStatistics = function () {
    var html = closeButton + divRowStart + divColumnStartTitle + "<h3>Statistics for Column <b>" + this.name + "</b></h3>" + divEnd + divEnd;
    html += this.createStatisticsForProperty("Datatype", this.datatype);
    html += this.createStatisticsForProperty("Empty cells", this.emptyCount);
    html += this.createStatisticsForProperty("Faulty cells", this.faultyCount);
    return html;
};

/**
 * generates html statistics for the property
 * @param {string} property
 * @param {string} value
 * @return {html}
 */
ColumnInfo.prototype.createStatisticsForProperty = function (property, value) {
    return divRowStart + divColumnStartKey + property + divEnd + divColumnStartValue + value + divEnd + divEnd;
};


/**
 * class IntColumn extends ColumnInfo
 * constructor, calculates the statistics for the [columnArray]
 * [columnInfo] is redirected to the super-constructor
 * @param {ColumnInfo} columnInfo
 * @param {Array} columnArray
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
}

IntColumn.prototype = Object.create(ColumnInfo.prototype);
IntColumn.prototype.constructor = IntColumn;

/**
 * setter for sumOutliers
 * @param {number} sumOutliers
 */
IntColumn.prototype.setSumOutliers = function (sumOutliers) {
    this.sumOutliers = sumOutliers;
};

/**
 * generates html statistics for the column
 * @return {html}
 */
IntColumn.prototype.createStatistics = function () {
    var html = ColumnInfo.prototype.createStatistics.call(this);
    html += hrSeparator;
    html += ColumnInfo.prototype.createStatisticsForProperty.call(this, "Average", this.average.toFixed(2));
    html += ColumnInfo.prototype.createStatisticsForProperty.call(this, "Median", this.secondQuartile.toFixed(2));
    html += ColumnInfo.prototype.createStatisticsForProperty.call(this, "First Quartile", this.firstQuartile.toFixed(2));
    html += ColumnInfo.prototype.createStatisticsForProperty.call(this, "Third Quartile", this.thirdQuartile.toFixed(2));
    html += hrSeparator;
    html += ColumnInfo.prototype.createStatisticsForProperty.call(this, "Deviation", this.deviation.toFixed(2));
    html += ColumnInfo.prototype.createStatisticsForProperty.call(this, "Inter Quartile Range (IQR)", this.iqr.toFixed(2));
    html += hrSeparator;
    html += ColumnInfo.prototype.createStatisticsForProperty.call(this, "Minimum", this.min.toFixed(2));
    html += ColumnInfo.prototype.createStatisticsForProperty.call(this, "Maximum", this.max.toFixed(2));
    html += ColumnInfo.prototype.createStatisticsForProperty.call(this, "Number of unique values", this.uniqueValuesCount);
    return html;
};


/**
 * class DoubleColumn extends ColumnInfo
 * constructor
 * [columnInfo] is redirected to the super-constructor (IntColumn), which has the same statistics as DoubleColumn
 * @param {ColumnInfo} columnInfo
 * @param {Array} columnArray
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
 * @param {Array} columnArray
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
 * generates html statistics for the column
 * @return {html}
 */
StringColumn.prototype.createStatistics = function () {
    var html = ColumnInfo.prototype.createStatistics.call(this);
    html += hrSeparator;
    html += ColumnInfo.prototype.createStatisticsForProperty.call(this, "Minimum length", this.minLength);
    html += ColumnInfo.prototype.createStatisticsForProperty.call(this, "Maximum length", this.maxLength);
    html += ColumnInfo.prototype.createStatisticsForProperty.call(this, "Average length", this.averageLength.toFixed(2));
    html += ColumnInfo.prototype.createStatisticsForProperty.call(this, "Number of unique values", this.uniqueValuesCount);
    return html;
};



/**
 * class BooleanColumn extends ColumnInfo
 * constructor, BooleanColumn does not have any stats to calculate
 * @param {ColumnInfo} columnInfo
 * @param {Array} columnArray
 */
function BooleanColumn (columnInfo, columnArray) {
    // call super-constructor
    ColumnInfo.call(this, columnInfo);
}

BooleanColumn.prototype = Object.create(ColumnInfo.prototype);
BooleanColumn.prototype.constructor = BooleanColumn;
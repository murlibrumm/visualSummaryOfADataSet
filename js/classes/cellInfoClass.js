// tutorial on object-oriented-JS: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Introduction_to_Object-Oriented_JavaScript

// every cell has a different id, this variable saves the id for the next cell.
// it is incremented after a new cell was created.
var cellId = 0;

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
    this.isString = false;
    this.isOutlier = false;
    this.cellId = cellId++;

    if (this.cellValue === "" || this.cellValue === "-") {
        this.isEmpty = true;
    } else {
        if (csvThousandsSeparator != "") {
            if (regexpInt.exec(this.cellValue.replace(csvThousandsSeparator, "")) !== null) {
                this.cellValue = this.cellValue.replace(csvThousandsSeparator, "");
                this.isInt = true;
            }
        } else {
            if (regexpInt.exec(this.cellValue) !== null) {
                this.isInt = true;
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

        if (!this.isBoolean && !this.isDouble && !this.isInt) {
            this.isString = true;
        }
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
 * setter for isFaulty
 * @param {boolean} isFaulty
 */
CellInfo.prototype.setIsFaulty = function (isFaulty) {
    this.isFaulty = isFaulty;
};
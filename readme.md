# ViSu - Visual Summary of a Dataset

A web-based prototype to visually summarize datasets (csv-files). Built upon d3.js, dc.js and Bootstrap.

## Getting Started

These instructions will get you a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

Install PHP on your system. PHP can be downloaded from http://php.net/downloads.php.

After the installation, you should be able to start a PHP-server from your commandline. On a Windows PC, you have to add the PHP folder to your environment variables. To check if the installation was successful, type php --version in your commandline.

```
php --version
```

### Installing

Download or clone the repository. Navigate to the project's root folder in the commandline. This is where your PHP server must be started. To start the PHP server type the following command:

```
php -S localhost:8000
```

The PHP server will then listen to incoming requests on port 8000. Navigate to localhost:8000 in your browser. The upload page of ViSu should be visible.

An example csv-file (P16TAbs5.csv) is located in the data folder. It contains data of the first Austrian presidential vote of 2016. To load the file provide information on the file's format (see screenshot below) and click "Upload file".

![Alt upload page](/readmeImg/upload.png?raw=true "upload page")

You get redirected to the summary page, where you can inspect the data and correlations further, using techniques like "linking and brushing". Histograms of each column of the dataset are displayed at the top of the page. Below them, a table with the raw data is displayed. Histograms are linked to gether as well as linked to the table. By selecting data one histogram, all the other histograms and the table are updated. The screenshot below shows histograms which are filtered by a user's selection.

![Alt visual summary page](/readmeImg/visualsummary.png?raw=true "visual summary page")

## Built With

* [D3.js](https://d3js.org/) - Library for visualizing and working with datasets. Emphasizes web standards (HTML5, CSS, SVG). For displaying mouseover tooltips I used the plugin [d3-tip](https://github.com/Caged/d3-tip).
* [DC.js](https://dc-js.github.io/dc.js/) - Allows efficient exploration on large multivariate datasets. Has native [crossfilter](http://square.github.io/crossfilter/) support. Crossfilter is used to link the different visualizations of the data and update them based on user selections.
* [Bootstrap](http://getbootstrap.com/) - Used for better looks and responsiveness. I used a [plugin](http://getbootstrap.com/javascript/#tooltips) for displaying tooltips.
* [jQuery](https://jquery.com/) - Used to simplify working with the DOM. I also used the [doubleScroll](https://github.com/avianey/jqDoubleScroll) plugin to display an additional scrollbar on top of the data table.

## License

This project is licensed under the MIT License - see the [License.md](License.md) file for details

# Profile log visualizer

This repository is set up to be built via the build-sdk repository using CMake,
but it can also be built independently by following the guidelines below.

## Building without CMake

Installing from source:

```shell
# Requires git and a recent Node.js installation

git clone https://github.com/sharemind-sdk/profile_log_visualizer.git
cd profile_log_visualizer
# The version number is kept in CMakeLists file, but npm requires it in package.json
# Edit package.json and set the version number
nano package.json
# Install dependencies
npm install
```

## Usage

This repository contains two tools:

* `analyser-cli` - a command line tool for processing the CSV format profiler logs
* `analyser-gui` - a GUI tool for visualizing the result

The command line tool allows you to pre-process one or more profiler logs and
aggregate the results into a JSON file which can be used with the GUI tool.

    ./analyser-cli profile-log-0.csv profile-log-1.csv profile-log-2.csv

The GUI tool allows you to load either a JSON file (produced by `analyser-cli`)
or CSV files (the raw profiler output from the Sharemind server application).

    ./analyser-gui

### Notes

* Network graphs are displayed only when logs from all parties are available.
* Loading large CSV files in the GUI tool can take slightly longer than
pre-processing them with the command line tool. It also has the benefit of
doing all the aggregation work only once.

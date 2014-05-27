/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
"use strict";

var yesterday = new Date();
yesterday.setDate(yesterday.getDate() - 1);

//var baseUrl = '/fxosping'; // TODO change me
var baseUrl = 'https://s3-us-west-2.amazonaws.com/telemetry-public-analysis/fxosping/data';
var pingData = {};
var filterNames = ['os', 'model', 'pixel_ratio', 'locale', 'network', 'resolution', 'hardware'];
var filters = {};

function zpad(aNum) {
    return (aNum < 10 ? "0" : "") + aNum;
}

function yyyymmdd(aDate) {
  var year = aDate.getUTCFullYear();
  var month = aDate.getUTCMonth() + 1;
  var day = aDate.getUTCDate();
  return "" + year + zpad(month) + zpad(day);
}

function buildData(key, rawData) {
  _.each(rawData, function(row) {
    var day = row[0];
    var prop = row[1];

    if (!pingData[day]) {
      pingData[day] = {};
    }

    if (prop === 'median_time_to_ping' ||
        prop === 'ping_count') {
      pingData[day][prop] = row[2];
      return;
    }

    var uniqueKey = _.first(_.rest(row, 2), row.length - 3).join(',');
    var dayProps = {};

    dayProps[prop] = {};
    dayProps[prop][uniqueKey] = _.last(row);

    pingData[day] = _.merge(pingData[day], dayProps);
  });

  buildFilters();
  updateChart();
}

function uniqueKeys(propName) {
  return _(pingData).chain()
    .map(function(props) {
      return propName in props ? Object.keys(props[propName]) : [];
    })
    .flatten()
    .uniq()
    .sort()
    .value();
}

function buildFilters() {
  _.each(filterNames, function(name) {
    var filter = $('#filter-' + name);
    filter.empty();

    filter.append($('<option>', {
      text: 'ALL',
      value: 'ALL'
    }));

    _.each(uniqueKeys(name), function(option) {
      filter.append($('<option>', {
        text: option,
        value: option
      }));
    });

    filter.selectpicker('refresh');
  });
}

var chart;

function createChart() {
  nv.addGraph(function() {
    chart = nv.models.linePlusBarChart()
            .margin({top: 30, right: 60, bottom: 50, left: 70});

    chart.xAxis.tickFormat(function(d) {
      return d3.time.format('%x')(new Date(d));
    });

    chart.y1Axis.tickFormat(d3.format(',f'));
    chart.y2Axis.tickFormat(d3.format(',f'));
    chart.bars.forceY([0]);

    d3.select('#chart svg')
      .transition()
      .duration(0)
      .call(chart);

    nv.utils.windowResize(chart.update);

    return chart;
  });
}

function updateChart() {
  var created = false;
  if (!chart) {
    createChart();
    created = true;
  }

  var chartData = [{
    key: 'Daily',
    bar: true,
    color: 'rgba(200,200,200,0.7)',
    values: [],
  }, {
    key: 'Total',
    color: 'rgba(170,190,220,0.7)',
    values: [],
  }];

  var total = 0;
  var dates = Object.keys(pingData);
  dates = dates.sort();

  _.each(dates, function(date) {
    if (pingData[date] === null) {
        return;
    }

    var pingCount = parseInt(pingData[date].ping_count);
    total += pingCount;

    var actualDate = d3.time.format('%Y%m%d').parse(date);
    chartData[0].values.push({x: +actualDate, y: pingCount});
    chartData[1].values.push({x: +actualDate, y: total});
  });

  d3.select('#chart svg')
    .datum(chartData)
    .transition()
    .duration(0);
    //.call(chart);

  /*if (created) {
      nv.utils.windowResize(chart.update);
  }*/
}

function updateData(key, cb) {
  var xhr = new XMLHttpRequest();
  var url = baseUrl + '/fxosping_' + key + '.csv.gz';

  xhr.open('GET', url, true);
  xhr.onload = function() {
    if (xhr.status != 200 && xhr.status != 0) {
      console.log('Failed to load ' + url);
      pingData[key] = null;
    } else {
      buildData(key, $.csv.toArrays(xhr.responseText));
    }
    cb(key);
  };

  xhr.onerror = function() {
    console.log('Failed to fetch: ' + url);
    pingData[key] = null;
    cb(key);
  };

  try {
    xhr.send(null);
  } catch (e) {
    console.log('Failed to fetch: ' + url);
    pingData[key] = null;
    cb(key);
  }
}

$(function() {
  $('.selectpicker').selectpicker();

  var current = new Date(yesterday);
  var key = yyyymmdd(current);

  function nextUpdate() {
    if (!pingData[key]) {
        // Last known data reached
        updateChart();
        return;
    }

    console.log('Got data for', key);

    current.setDate(current.getDate() - 1);
    key = yyyymmdd(current);
    updateData(key, nextUpdate);
  }

  updateData(key, nextUpdate);
});


/**
 * This is an implementation of the `selectorType` for `histogramfilter` as
 * defined in `jquery.telemetry.js`. This uses bootstrap-select for rendering
 * selectors, creating a very nice UI.
 */
var BootstrapSelector = (function($){
  function BootstrapSelector(filterName, label) {
    this._selectId = "select-" + filterName;
    this._filterName = filterName;
    this._span = $("<span>");
    if (label) {
      this._label = $("<label>");
      this._label.addClass("control-label")
                 .attr("for", this._selectId)
                 .text(label);
      this._span.append(this._label);
    }

    this._select = $("<select>");
    this._select.attr("id", this._selectId);
    this._span.append(this._select);

    this._options = [];
    this._select.bind("change", $.proxy(function() {
      if (this._callback !== undefined) {
        this._callback(this, this.val());
      }
    }, this));
    this._select.addClass("show-tick");
    if (this._filterName === "version" || this._filterName === "measure") {
      this._select.data("live-search", true);
    }
    this._select.addClass("filter-" + this._filterName);
    this._select.selectpicker();
  }

  $.extend(BootstrapSelector.prototype, {
    element: function BootstrapSelector_element() {
      return this._span;
    },

    options: function BootstrapSelector_options(options) {
      if (options !== undefined) {
        // Clear existing options
        this._select.empty();

        var parent = this._select;
        var n = options.length;
        for(var i = 0; i < n; i++) {
          var option = options[i];

          var label = option;
          // Special label if we're displaying versions
          if (this._filterName === "version") {
            var opts = option.split("/");
            if (opts[0] !== parent.attr("label")) {
              parent = $("<optgroup>", {label: opts[0]});
              this._select.append(parent);
            }
            var label = label.replace("/", " ");
          }

          // Add <option>
          parent.append($("<option>", {
            text:       label,
            value:      option
          }));
        }

        // Store options for another time
        this._options = options;

        // Update bootstrap select
        this._select.selectpicker('refresh');
      }
      return this._options;
    },

    val: function BootstrapSelector_val(value) {
      if (value !== undefined) {
        this._select.val(value);
        this._select.selectpicker('render');
      }
      return this._select.val();
    },

    change: function BootstrapSelector_change(cb) {
      this._callback = cb;
    },

    destroy: function BootstrapSelector_destroy() {
      this._callback = null;
      this._options = null;
      this._select.remove();
      this._span.remove();
    },
  });

  return BootstrapSelector;
})(jQuery);

define(function (require, exports, module) {
    // requirments
    var $ = require('jquery');
    var events = require('base/js/events');
    var Jupyter = require('base/js/namespace');
    var utils = require('base/js/utils');
    var CellToolbar = require('notebook/js/celltoolbar').CellToolbar;
    var CodeCell = require('notebook/js/codecell').CodeCell;
    var ConfigSection = require('services/config').ConfigSection;

    var log_prefix = '[' + module.id + ']';
    var options = { // updated from server's config on loading nbextension
        run_on_kernel_ready: true,
    };

    var init_cell_ui_callback = CellToolbar.utils.checkbox_ui_generator(
        'Initialisation Cell',
        // setter
        function (cell, value) {
            cell.metadata.init_cell = value;
        },
        // getter
        function (cell) {
             // if init_cell is undefined, it'll be interpreted as false anyway
            return cell.metadata.init_cell;
        }
    );

    function run_init_cells () {
        console.log(log_prefix, 'running all initialization cells');
        var num = 0;
        var cells = Jupyter.notebook.get_cells();
        for (var ii = 0; ii < cells.length; ii++) {
            var cell = cells[ii];
            if ((cell instanceof CodeCell) && cell.metadata.init_cell === true ) {
                cell.execute();
                num++;
            }
        }
        console.log(log_prefix, 'finished running ' + num + ' initialization cell' + (num !== 1 ? 's' : ''));
    }

    var load_ipython_extension = function() {
        // register action
        var prefix = 'auto';
        var action_name = 'run-initialization-cells';
        var action = {
            icon: 'fa-calculator',
            help: 'Run all initialization cells',
            help_index : 'zz',
            handler : run_init_cells
        };
        var action_full_name = Jupyter.notebook.keyboard_manager.actions.register(action, action_name, prefix);

        // add toolbar button
        Jupyter.toolbar.add_buttons_group([action_full_name]);

        // Register a callback to create a UI element for a cell toolbar.
        CellToolbar.register_callback('init_cell.is_init_cell', init_cell_ui_callback, 'code');
        // Register a preset of UI elements forming a cell toolbar.
        CellToolbar.register_preset('Initialisation Cell', ['init_cell.is_init_cell']);

        var base_url = utils.get_body_data('baseUrl');
        var conf_section = new ConfigSection('notebook', {'base_url': base_url});
        conf_section.load()
            .then(
                function on_success (new_config_data) {
                    // update options from server config
                    $.extend(true, options, new_config_data.init_cell);
                }, function on_error (err) {
                    console.warn(log_prefix, 'error loading options from config:', err);
                    console.warn(log_prefix, 'Using default options:', options);
                })
            .then(function () {
                if (options.run_on_kernel_ready) {
                    if (Jupyter.notebook && Jupyter.notebook.kernel && Jupyter.notebook.kernel.info_reply.status === 'ok') {
                        // kernel is already ready
                        run_init_cells();
                    }
                    // whenever a (new) kernel  becomes ready, run all initialization cells
                    events.on('kernel_ready.Kernel', run_init_cells);
                }
            });
    };

    return {
        load_ipython_extension : load_ipython_extension
    };
});

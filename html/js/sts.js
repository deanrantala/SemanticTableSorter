$(document).ready(function(){

    /*
     * @file A Simple Table Sorter - STS (aliased as TS)
     * @version 0.1.1
     * @author Dean M. Rantala <deanrantala@gmail.com>
     * @copyright GNU General Public License, Version 3
     */

    var sts = function(table) {
        
        var sts_obj = this;
        var sts_id = false;
        var table_obj = table;
        
        /*
         * All settings that follow can be set via the $.sts() constructor, OR by attaching each
         * to a data-* attribute.  For example, to configure rows_per_page, you can add a data-rows_per_page="20"
         * to your table.
         * 
         */
        var settings = {
            ajax_url: false,                // The URL to use for ajax requests
            rows_per_page: 15,              // How many rows do you wish to display per-page?
            total_pages: false,             // Generally used internally, do not mess with this unless you know what you are doing
            total_rows: false,              // Used internally
            page: 1,                        // Default page to start at
            sort_on: 1,                     // Default column to sort on (columns are indexed starting at "1"!)
            sort_order: 'asc',              // Default sort order
            autohide_pager: true,           // If the total result set is less than the configured rows_per_page, do you want the pager automatically hidden?
            disable_pager: false,           // If true, only the sorting is enabled, and pagination is disabled
            on_ajax_begin: false,           // If using ajax mode, this callback will be executed before the ajax call starts
            on_ajax_complete: false,        // If using ajax mode, this callback will be executed when the ajax is done, and all data is rendered
            persist_on_bottom_class: false, // All <tr>'s with the class defined here will always be forced/visible on the bottom of the table
            template_source: false,         // Handlebars template source
            template_function: false        // Handlebars pre-compiled template object
        };
        
        var ajax_loading = false;
        
        this.set_option = function(key,value) {
            settings[key] = value;
        };
        
        this.get_option = function(key) {
            if(typeof settings[key] != 'undefined') {
                return settings[key];
            } else {
                console.log('STS error: settings key \''+key+'\' does not exist!');
            }
        }

        /*
         * Initialize the table sorter
         * @param {object} options
         * @returns {void}
         */
        this.init = function(options=false) {

            sts_id = $(table_obj).attr('id');
            
            $(table_obj).addClass('sts');
            
            if(typeof options === 'object')
            {
                for(var k in options) {
                    if(options.hasOwnProperty(k)) {
                        sts_obj.set_option(k,options[k]);
                    }
                }
            }

            if(settings.disable_pager===true)
            {
                settings.rows_per_page = 100000000;
            }
           
            if(settings.ajax_url===false && parseInt(settings.rows_per_page,10)===0) {
                settings.rows_per_page = $(table_obj).find('tbody tr:not([data-exclude])').length;
            }
            
            if(settings.ajax_url!==false && isNaN(settings.sort_on)===false) {
                var i = 1;
                $(table_obj).find('thead th').each(function(){
                    if( i===parseInt(settings.sort_on) ) {
                        sts_obj.set_option('sort_on',$(this).attr('data-column'));
                    }
                    i++;
                });
            }
            settings.sort_order = settings.sort_order.toLowerCase();
            
            if(settings.rows_per_page==0) {
                settings.rows_per_page = 1000000;
            }
            
            sts_obj.refresh(1);
            
        };
        
        /*
         * Destroy/remove sts instance from a table
         * @returns {void}
         */
        this.destroy = function() {
            // @todo: need to implement this, but it is currently not a hot item.
        };
        
        /*
         * Refresh the table sorter
         * @param {number} page
         * @returns {void}
         */
        this.refresh = function(page=null) {
            if(page!==null && Number.isInteger(page)) {
                settings.page = page;
                sts_obj.update_pager_jump();
            }
            if(settings.ajax_url!==false) {
                sts_obj.init_ajax();
            } else {
                sts_obj.init_static();
            }            
        };
        
        

        /*
         * Initialization routine if this is an ajax-paging table
         * @returns {void}
         */
        this.init_ajax = function() {
            this.load_ajax();
            this.init_headers();
            this.init_pagers();
        };

        /**
         * Initialization routine if this is a static (non-ajax-paging) table
         * @returns {void}
         */
        this.init_static = function() {
            this.sort();
            this.init_headers();
            this.init_pagers();
        };
        
        /**
         * Initialize the headers for each instance (attach click events, etc)
         * @returns {void}
         */
        this.init_headers = function() {
            i = 1;
            $(table_obj).find('thead tr:not([data-exclude]) th').each(function(){
                
                if(settings.ajax_url===false) {
                    $(this).attr('data-column',i);
                }
                if($(this).attr('data-no-sort')===undefined) {
                    // First, clear any existing event handlers
                    $(this).off();
                    $(this).click(function(){
                        if(ajax_loading===true) {
                            return false;
                        }
                        var col = $(this).attr('data-column');
                        if($(this).attr('data-sorted')!==undefined) {
                            if(settings.sort_order==='asc') {
                                settings.sort_order = 'desc';
                            } else {
                                settings.sort_order = 'asc';
                            }
                        } else {
                            settings.sort_order = 'asc';
                        }
                        settings.sort_on = col;
                        settings.page = 1;
                        if(settings.ajax_url===false) {
                            sts_obj.sort();
                        } else {
                            sts_obj.load_ajax();
                        }
                    });
                }
                i++;
            });
        };
        
        /**
         * Go to a specific page
         * @param {number} page
         * @returns {void}
         */
        this.goto_page = function(page) {
            if(ajax_loading===true) {
                return;
            }
            sts_obj.start_pager_loading_state();
            if(Number.isInteger(page)) {
                settings.page = page;
                sts_obj.update_pager_jump();
                if(settings.ajax_url===false) {
                    sts_obj.sort();
                } else {
                    sts_obj.load_ajax();
                }
            } else {
                console.log('Error: sts goto_page requires an integer value');
            }
        };
        
        /*
         * Update the "jump to page" (if applicable)
         * @returns {void}
         */
        this.update_pager_jump = function() {
            $('[data-pager='+sts_id+'] select.jump-to').val(settings.page);
        };

        this.start_pager_loading_state = function() {
            $('[data-pager='+sts_id+']').each(function(){
                var pager = $(this);
                var elements = $(pager).find('.first, .prev, .next, .last');
                $(elements).attr('disabled','disabled');
                $(elements).addClass('disabled');
            });
        }

        /**
         * Initialize each of the pager sets for this instance
         * @returns {void}
         */
        this.init_pagers = function() {
            
            $('[data-pager='+sts_id+']').each(function(){
                
                var pager = $(this);
                
                // If the pager has already been initialized, there is nothing to do...
                if($(pager).attr('data-pager-initialized')) {
                    return true;
                }
                
                $(pager).attr('data-pager-initialized',1);
                $(pager).addClass('sts-pager');
                
                $(pager).find('.page-size').change(function(){
                    sts_obj.set_option('autohide_pager',false);
                    var rows_per_page = parseInt($(this).val(),10);
                    $(pager).find('.page-size').val(rows_per_page);
                    if(rows_per_page===0) {
                        rows_per_page = settings.total_rows;
                    }
                    sts_obj.set_option('rows_per_page',rows_per_page);
                    sts_obj.refresh(1);
                });
                
                $(pager).find('.prev').click(function(){
                    if(settings.page>1) {
                        sts_obj.goto_page(settings.page-1);
                    }
                });
                
                $(pager).find('.next').click(function(){
                    if(settings.page<settings.total_pages) {
                        sts_obj.goto_page(settings.page+1);
                    }
                });
                
                $(pager).find('.first').click(function(){
                    if(settings.page>1) {
                        sts_obj.goto_page(1);
                    }
                });
                
                $(pager).find('.last').click(function(){
                    if(settings.page<settings.total_pages) {
                        sts_obj.goto_page(settings.total_pages);
                    }
                });
                
                $(pager).find('.jump-to').each(function(){
                    
                    var select = $(this);
                    if(settings.ajax_url===false) {
                        for(var i=1;i<=settings.total_pages;i++) {
                            var opt = document.createElement('OPTION');
                            $(opt).html(i);
                            $(opt).val(i);
                            $(select).append(opt);
                        }
                    }
                    $(select).change(function(){
                        if(ajax_loading===true) {
                            $(this).val(settings.page);
                        }
                        var newpage = $(this).val();
                        sts_obj.goto_page(newpage);

                    });                    
                });
            });
        };
        
        /*
         * Update the pagers (first, prev, next, last buttons and ensures jump-to-page select is correctly populated)
         * @returns {void}
         */
        this.update_pagers = function() {
            
            if(parseInt(settings.end_row, 10)>parseInt(settings.total_rows, 10)) {
                settings.end_row = settings.total_rows;
            }

            $('[data-pager='+sts_id+']').each(function(){
                var pager = $(this);
                
                if(parseInt(settings.total_rows,10)<=parseInt(settings.rows_per_page,10) && settings.autohide_pager===true) {
                    // Hide the pager completely.
                    $(pager).hide();
                } else {
                    $(pager).show();
                    //console.log('total pages:'+settings.total_pages);
                    if(settings.total_pages>1) {
                        // Hide all buttons to the right?
                        
                        if(settings.page===settings.total_pages) {
                            $(pager).find('.next, .last').addClass('disabled');
                            $(pager).find('.next, .last').attr('disabled','disabled');
                        } else {
                            $(pager).find('.next, .prev, .first, .last').removeClass('disabled');
                            $(pager).find('.next, .prev, .first, .last').removeAttr('disabled');
                        }
                        // Hide all buttons to the left?
                        if(settings.page===1) {
                            $(pager).find('.prev, .first').addClass('disabled');
                            $(pager).find('.prev, .first').attr('disabled','disabled');
                        } else {
                            $(pager).find('.prev, .first').removeClass('disabled');
                            $(pager).find('.prev, .first').removeAttr('disabled');
                        }
                    } else {
                        $(pager).find('.next, .prev, .first, .last').addClass('disabled');
                        $(pager).find('.next, .prev, .first, .last').attr('disabled','disabled');
                    }
                    // Update the DOM with some useful info about current status
                    $(pager).find('.rows-per-page').val(settings.rows_per_page);
                    $(pager).find('.current-page').html(settings.page);
                    $(pager).find('.total-pages').html(settings.total_pages);
                    $(pager).find('.start-record').html(settings.start_row+1);
                    $(pager).find('.end-record').html(settings.end_row+1);
                    $(pager).find('.total-records').html(settings.total_rows);
                }
            });
            
            // Populate the "jump to page" <select> object accordingly
            $('[data-pager='+sts_id+'] select.jump-to').each(function(){
                if(settings.total_pages!==$(this).find('option').length) {
                    $(this).html('');
                    for(var i=1;i<=settings.total_pages;i++) {
                        var opt = document.createElement('OPTION');
                        $(opt).html(i);
                        $(opt).val(i);
                        $(this).append(opt);                            
                    }
                }
            });

        };
        
        /*
         * Update the various meta data (classes and attributes) related to the <thead>/<th> elements
         * @returns {void}
         */
        this.update_th_meta = function() {
            //console.log('Updating th meta');
            // Manage the sortable/non-sortable classes
            $(table_obj).find('thead tr:not([data-exclude]) th').each(function(){
                if($(this).attr('data-no-sort')===undefined) {
                    $(this).removeClass('non-sortable');
                    $(this).addClass('sortable');
                } else {
                    $(this).addClass('non-sortable');
                    $(this).removeClass('sortable');
                }
            });
            // Manage the data-sorted attributes and sort-asc/sort-desc classes
            $(table_obj).find('thead tr:not([data-exclude]) th').removeAttr('data-sorted');
            $(table_obj).find('thead tr:not([data-exclude]) th').removeClass('sort-asc sort-desc');
            if(settings.ajax_url===false) {
                $(table_obj).find('thead tr:not([data-exclude]) th:nth-child('+settings.sort_on+')').attr('data-sorted',1);
                $(table_obj).find('thead tr:not([data-exclude]) th:nth-child('+settings.sort_on+')').addClass('sort-'+settings.sort_order);
            } else {
                $(table_obj).find('thead tr:not([data-exclude]) th[data-column='+settings.sort_on+']').attr('data-sorted',1);
                $(table_obj).find('thead tr:not([data-exclude]) th[data-column='+settings.sort_on+']').addClass('sort-'+settings.sort_order);                
            }
        
        };
        
        /*
         * Update <tr> styles. 
         * @returns {void}
         */
        this.update_tr_styles = function() {
            $(table_obj).find('tbody tr:not([data-exclude])').removeClass('row-even row-odd');
            var i = 0;
            $(table_obj).find('tbody tr:visible:not([data-exclude])').each(function(){
                if(i % 2) {
                    $(this).addClass('row-even');
                } else {
                    $(this).addClass('row-odd');
                }
                i++;                
            });
        };
       
        /*
         * Load the data/page via ajax
         * @returns {void}
         */
        this.load_ajax = function() {
            
            ajax_loading = true;
            
            if(settings.on_ajax_begin!==false) {
                settings.on_ajax_begin();
            }
            
            
            
            /*
             * Logic to determine:
             * start_row and end_row (within the page)
             */
            settings.start_row = 0;
            settings.end_row = 0;
            if(settings.page===1) {
                settings.end_row = settings.rows_per_page;
            } else {
                settings.start_row = (settings.page-1) * settings.rows_per_page;
                settings.end_row = parseInt(settings.start_row) + parseInt(settings.rows_per_page);
            }

            sts_obj.update_th_meta();
            
            var url = settings.ajax_url+'/'+settings.start_row+'/'+settings.rows_per_page+'/'+settings.sort_on+'/'+settings.sort_order;

            $.ajax({
                type: 'GET',
                url: url,
                dataType: 'json',
                success: function(response) {
                    

                    
                    if(typeof response.total_rows === 'undefined') {
                        console.log('Error: ajax response is not compatible, please check the returned data');
                    } else {
                        
                        existing_md5 = '0';
                        if($(table_obj).attr('data-md5')) {
                            existing_md5 = $(table_obj).attr('data-md5');
                        }

                        new_md5 = '1';
                        if(typeof response.md5 != 'undefined') {
                            new_md5 = response.md5;
                        }

                        if(existing_md5!=new_md5) {
                            settings.total_rows = response.total_rows;
                            settings.total_pages = Math.ceil(response.total_rows / settings.rows_per_page);

                            if(settings.template_function !== false) {
                                $(table_obj).find('tbody').html(settings.template_function(response));
                            } else {
                                if(settings.template_source === false) {
                                    //console.log('Looking for script');
                                    var template_dom = $('script[data-template='+sts_id+']');
                                    //console.log('Length: '+template_dom.length);
                                    if(template_dom.length>0) {
                                        //console.log($(template_dom[0]).html());
                                        //settings.template_source
                                        settings.template_source = $(template_dom[0]).html();
                                        //console.log(settings.template_source);
                                    }
                                }
                                if(settings.template_source!==false) {
                                    if(typeof Handlebars !== 'undefined') {
                                        settings.template_function = Handlebars.compile(settings.template_source);
                                        $(table_obj).find('tbody').html(settings.template_function(response));
                                    } else {
                                        console.log('Handlebars template engine is required but was not found or loaded.');
                                    }
                                } else {
                                    console.log('Unable to render response data: no template_function was provided. Additionally, the template_source was not provided nor was a <script data-template="'+sts_id+'"> found in the DOM');
                                }
                            }
                            sts_obj.update_pagers();
                            sts_obj.update_tr_styles();                            
                        }

                        if(new_md5!='1') {
                            $(table_obj).attr('data-md5',new_md5);
                        }
                        

                    }
                    ajax_loading = false;
                    
                    if(settings.on_ajax_complete!==false) {
                        settings.on_ajax_complete(response);
                    }
                    
		},
                error: function(jqXHR,status,error) {
                    console.log('Error ('+status+') loading ajax resource: '+url);
                }
            });
        };
        
        
        /*
         * Sorting method used for non-ajax data sets
         * @returns {void}
         */
        this.sort = function() {
            
            sts_obj.update_th_meta();
            
            // sortdata will hold the data we are sorting on
            var sortdata = [];
            
            // Default to 'number' data type
            var data_type = 'number';
            
            /*
             * Loop through the table rows and:
             * 1) build a sortable array to index by
             * 2) detect the data type that we will sort on
             */
            
            var collection = $(table).find('tbody tr:not([data-exclude])').remove();
            
            for(var i=0;i<collection.length;i++) {
                var td = $(collection[i]).find('td:nth-child('+settings.sort_on+')');
                var dsr = $(td).attr('data-sort-value');
                if(dsr) {
                    collection[i]._sort_value = dsr;
                } else {
                    // The simple replace hack helps column that contain only percentile values
                    collection[i]._sort_value = $(td).text().replace('%','');
                }
                if(collection[i]._sort_value!=='' && isNaN(collection[i]._sort_value)===true) {
                    if(collection[i]._sort_value.match(/^\$/)) {
                        data_type = 'money';
                    } else {
                        data_type = 'string';
                    }
                }
            }

            settings.total_rows = i;
            
            /*
             * Sorting logic for columns with strings
             */
            if(data_type==='string') {
                //console.log('Sorting string');
                collection.sort(function(a,b){
                    var value_a = a._sort_value.toUpperCase();
                    var value_b = b._sort_value.toUpperCase();
                    if(settings.sort_order==='asc') {
                        return (value_a < value_b) ? -1 : (value_a > value_b) ? 1 : 0;
                    } else {
                        return (value_a > value_b) ? -1 : (value_a < value_b) ? 1 : 0;
                    }
                });
            }
            
            /*
             * Sorting logic for columns with numbers
             */
            if(data_type==='number') {
                collection.sort(function(a,b){
                    var value_a = parseFloat(a._sort_value);
                    var value_b = parseFloat(b._sort_value);
                    if(settings.sort_order==='asc') {
                        return (value_a < value_b) ? -1 : (value_a > value_b) ? 1 : 0;
                    } else {
                        return (value_a > value_b) ? -1 : (value_a < value_b) ? 1 : 0;
                    }
                });
            }
            
            /*
             * Sorting logic for columns with money values
             */
            if(data_type==='money') {
                collection.sort(function(a,b){
                    var value_a = parseFloat(a._sort_value.replace(/[^0-9\.]/g,''));
                    var value_b = parseFloat(b._sort_value.replace(/[^0-9\.]/g,''));
                    if(settings.sort_order==='asc') {
                        return (value_a < value_b) ? -1 : (value_a > value_b) ? 1 : 0;
                    } else {
                        return (value_a > value_b) ? -1 : (value_a < value_b) ? 1 : 0;
                    }
                });
            }
            
            /*
             * Logic to determine:
             * start_row and end_row (within the page)
             */
            settings.start_row = 0;
            settings.end_row = collection.length;
            if(settings.rows_per_page!==false) {
                settings.total_pages = Math.ceil(collection.length / settings.rows_per_page);
                if(settings.page===1) {
                    settings.end_row = settings.rows_per_page;
                } else {
                    settings.start_row = (settings.page-1) * settings.rows_per_page;
                    settings.end_row = parseInt(settings.start_row) + parseInt(settings.rows_per_page);
                }
            }

            /*
             * Re-order/rendering of the table rows
             * -> We iterate over each <tr> and for each, we remove it from the DOM
             * -> Rows within the "current page" are set to .show() and the <tr> re-inserted
             * -> Rows outside the "current page" are set to .hide() and the <tr> and re-inserted
             * -> If we have the "persist_on_bottom_class" defined, we remove that <tr>, set it to .show() and re-insert it at the BOTTOM
             */
            for(var i=0;i<collection.length;i++) {
                if(i<settings.start_row || i>=settings.end_row) {
                    $(collection[i]).hide();
                } else {
                    $(collection[i]).show();
                }                
            }

            $(table_obj).find('tbody').prepend(collection);
            
            if(settings.persist_on_bottom_class!==false) {
                var tr = $(table).find('tr.'+settings.persist_on_bottom_class).remove();
                $(table).find('tbody').append(tr);
            }
            
            this.update_pagers();
            this.update_tr_styles();

        };

    };

    /*
     * Initialize the table sort object
     * @param {object|string} options - should be an object when instantiating new instance, string when calling methods
     * @param {string} args - example: $('#mytable').sts('goto_page',2) or $('#mytable').sts('refresh');
     * @returns {object} sts instance
     */
    jQuery.fn.sts = function(options={},args=null) {

        if($(this).data('sts')) {
            if(args===null) {
                var obj = $(this).data('sts');
                return obj.get_option(options);
            }
        }
        
        return this.each(function(){
            var table_obj = $(this);
            var sts_obj = null;
            if (table_obj.data('sts')) {
                //console.log('found data');
                sts_obj = table_obj.data('sts');
            } else {
                sts_obj = new sts(table_obj);
                table_obj.data('sts',sts_obj);
            }
            if(typeof options ==='object') {
                sts_obj.init(options);
            } else if(typeof options==='string') {
                if(options==='refresh' || options==='reload') {
                    sts_obj.refresh(args);
                } else if(options==='goto' || options==='goto_page') {
                    sts_obj.goto_page(args);
                } else if(options==='destroy') {
                    sts_obj.destroy();
                } else {
                    if(typeof sts_obj.settings[options] !== 'undefined') {
                        sts_obj.set_option(options,args);
                    } else {
                        console.log('Invalid option passed to sts');
                    }
                }
            } else {
                console.log('Invalid use of sts constructor');
            }
        });
    };
  
});


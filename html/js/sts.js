/*
 * The Semantic Table Sorter
 * sts - a simple table sorter
 * version 0.1 by Dean Rantala
 * <deanrantala@gmail.com>
 * @todo: documentation!!!!
 */			
$(document).ready(function(){

    var sts = function(table) {

        var settings = {
            ajax_url: false,
            rows_per_page: 15,
            total_pages: false,
            page: 1,
            sort_on: 1,
            sort_order: 'asc'
        };
        
        var ajax_loading = false;

        this.init = function() {
            $(table).addClass('sts')
            for(var k in settings) {
                if( $(table).attr('data-'+k)!==undefined ) {
                    settings[k] = $(table).attr('data-'+k);
                }
            }
            
            if(settings.ajax_url!==false && isNaN(settings.sort_on)===false) {
                var i = 1;
                $(table).find('thead th').each(function(){
                    if( i===parseInt(settings.sort_on) ) {
                        settings.sort_on = $(this).attr('data-column');
                    }
                    i++;
                });
            }
            
            if(settings.ajax_url===false) {
                this.init_static();
            } else {
                this.init_ajax();
            }
        }
        
        this.init_ajax = function() {
            this.load_ajax();
            this.init_headers();
            this.init_pagers();
        }
        
        this.init_static = function() {
            this.sort();
            this.init_headers();
            this.init_pagers();
        }
        
        this.init_headers = function() {
            i = 1;
            $(table).find('thead th').each(function(){
                if(settings.ajax_url===false) {
                    $(this).attr('data-column',i);
                }
                if($(this).attr('data-no-sort')===undefined) {
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
                            $(table).data('sts').sort();
                        } else {
                            $(table).data('sts').load_ajax();
                        }
                    });
                }
                i++;
            });
        }
        
        this.init_pagers = function() {
            var id = $(table).attr('id');
            $('[data-pager='+id+']').each(function(){
                var pager = $(this);
                $(pager).addClass('sts-pager');
                $(pager).find('.prev').click(function(){
                    if(ajax_loading===true) {
                        return false;
                    }
                    if(settings.page>1) {
                        settings.page--;
                        $('[data-pager='+id+'] select.jump-to').val(settings.page);
                        if(settings.ajax_url===false) {
                            $(table).data('sts').sort();
                        } else {
                            $(table).data('sts').load_ajax();
                        }
                    }
                });
                $(pager).find('.next').click(function(){
                    if(ajax_loading===true) {
                        return false;
                    }                    
                    if(settings.page<settings.total_pages) {
                        settings.page++;
                        $('[data-pager='+id+'] select.jump-to').val(settings.page);
                        if(settings.ajax_url===false) {
                            $(table).data('sts').sort();
                        } else {
                            $(table).data('sts').load_ajax();
                        }
                    }
                });
                $(pager).find('.first').click(function(){
                    if(ajax_loading===true) {
                        return false;
                    }                    
                    if(settings.page>1) {
                        settings.page = 1;
                        $('[data-pager='+id+'] select.jump-to').val(settings.page);
                        if(settings.ajax_url===false) {
                            $(table).data('sts').sort();
                        } else {
                            $(table).data('sts').load_ajax();
                        }
                    }
                });
                $(pager).find('.last').click(function(){
                    if(ajax_loading===true) {
                        return false;
                    }                    
                    if(settings.page<settings.total_pages) {
                        settings.page = settings.total_pages;
                        $('[data-pager='+id+'] select.jump-to').val(settings.page);
                        if(settings.ajax_url===false) {
                            $(table).data('sts').sort();
                        } else {
                            $(table).data('sts').load_ajax();
                        }
                    }
                });
                
                $(pager).find('select.jump-to').each(function(){
                    
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
                            return false;
                        }                        
                        console.log('Page jump initiated');
                        settings.page = $(this).val();
                        $('[data-pager='+id+'] select.jump-to').val(settings.page);
                        if(settings.ajax_url===false) {
                            $(table).data('sts').sort();
                        } else {
                            $(table).data('sts').load_ajax();
                        }
                    });                    
                });
            });
        }
        
        this.update_pagers = function(start_row,end_row,total_rows) {
            var id = $(table).attr('id');
            /*
             * Update the "page X of Y" text
             */
            start_row++;
            if(parseInt(end_row, 10)>parseInt(total_rows, 10)) {
                end_row = total_rows;
            }
            $('[data-pager='+id+']').each(function(){
                var pager = $(this);
                $(pager).find('.page-text').html('Page ');
                $(pager).find('.page-total').html(' of '+settings.total_pages);
				$(pager).find('.row-text').html('Records '+start_row+' - '+end_row+' of '+total_rows);
            });
            if(settings.ajax_url!==false) {
                var total_pages = Math.ceil(total_rows / settings.rows_per_page);
                $('[data-pager='+id+'] select').each(function(){
                    if(total_pages!==$(this).find('option').length) {
                        $(this).html('');
                        for(var i=1;i<=total_pages;i++) {
                            var opt = document.createElement('OPTION');
                            $(opt).html(i);
                            $(opt).val(i);
                            $(this).append(opt);                            
                        }
                    }
                });                
            }
            // ADD JUMP-TO UPDATE LOGIC HERE IF AJAX MODE
	    // Here we are many months after I wrote this and have no idea what I was going to do...
        }
        
        this.update_th_meta = function() {
        
            /*
             * Manage the <th> classes and attributes
             */
            $(table).find('thead th').each(function(){
                if($(this).attr('data-no-sort')===undefined) {
                    $(this).removeClass('non-sortable');
                    $(this).addClass('sortable');
                } else {
                    $(this).addClass('non-sortable');
                    $(this).removeClass('sortable');
                }
            });
            $(table).find('thead th').removeAttr('data-sorted');
            $(table).find('thead th').removeClass('sort-asc');
            $(table).find('thead th').removeClass('sort-desc');
            if(settings.ajax_url===false) {
                $(table).find('thead th:nth-child('+settings.sort_on+')').attr('data-sorted',1);
                $(table).find('thead th:nth-child('+settings.sort_on+')').addClass('sort-'+settings.sort_order);
            } else {
                $(table).find('thead th[data-column='+settings.sort_on+']').attr('data-sorted',1);
                $(table).find('thead th[data-column='+settings.sort_on+']').addClass('sort-'+settings.sort_order);                
            }
        
        }
        
        this.update_tr_styles = function() {
            $(table).find('tbody tr').removeClass('row-even');
            $(table).find('tbody tr').removeClass('row-odd');
            var i = 0;
            $(table).find('tbody tr:visible').each(function(){
                if(i % 2) {
                    $(this).addClass('row-even');
                } else {
                    $(this).addClass('row-odd');
                }
                i++;                
            });
        }

		this.show_loading = function() {

				var number_of_headers = $(table).find('thead th').length;
				var table_html = '<tr class="ajax-load"><td colspan="'+number_of_headers+'">Loading...</td>';
				$(table).find('tbody').html(table_html);
		};
        
        this.load_ajax = function() {
            
            ajax_loading = true;
            
            var number_of_headers = $(table).find('thead th').length;
            
            /*
             * Logic to determine:
             * start_row and end_row (within the page)
             */
            var start_row = 0;
            var end_row = 0;
            if(settings.page===1) {
                end_row = settings.rows_per_page;
            } else {
                start_row = (settings.page-1) * settings.rows_per_page;
                end_row = parseInt(start_row) + parseInt(settings.rows_per_page);
            }

            this.update_th_meta();
            
            var url = settings.ajax_url+'/'+start_row+'/'+settings.rows_per_page+'/'+settings.sort_on+'/'+settings.sort_order;
            console.log(url);
            //return false;
            $.ajax({
                type: 'GET',
                url: url,
                dataType: 'json',
                success: function(response) {
                    console.log(response);
                    var table_id = $(table).attr('id');
                    var tr_html = $('script[data-tr-template='+table_id+']').html();
					/*
					 * If a template was not found for each <tr>, we try our best
					 * to generate one based on the <th>'s found in the header...
					 */
                    if(!tr_html) {

                        tr_html = '<tr>';
                        $(table).find('thead th').each(function(){
                            tr_html += '<td>{'+$(this).attr('data-column')+'}</td>';
                        });
                        tr_html += '</tr>';
                    }
					// Time to loop over the records!!
					var tbody = '';
					for(var i=0;i<response.records.length;i++) {
                        var tr = tr_html;
						// ...and now over each column of each record
						for(var c in response.records[i]) {
							if(response.records[i].hasOwnProperty(c)) {
								// For each column found, let's replace the template placeholder with the
								// records column value...
								tr = tr.replace(new RegExp('{'+c+'}','g'),response.records[i][c]);
							}
						}
						// Now to append the newly-generated <tr> to the tbody
						tbody += tr;
                    }
					$(table).find('tbody').html(tbody);
					if(response.records.length==0) {
					// If no data was returned, we include a single tr//td with the usual message...
					$(table).find('tbody').append('<tr class="no-data"><td colspan="'+number_of_headers+'">No data to display</td></tr>');
					}
					// Few quick calculations to get the total pages, etc
					settings.total_pages = Math.ceil(response.total / settings.rows_per_page);
					$(table).data('sts').update_pagers(start_row,end_row,response.total);
					$(table).data('sts').update_tr_styles();

					ajax_loading = false;
				}
			});
        };
        
        /*
         * Sorting method used for non-ajax data sets
         */
        this.sort = function() {
  
            this.update_th_meta();
            
            // sortdata will hold the data we are sorting on
            var sortdata = [];
            
            // Default to 'number' data type
            var data_type = 'number';
            
            /*
             * Loop through the table rows and:
             * 1) build a sortable array to index by
             * 2) detect the data type that we will sort on
             */
            var i=0;
            $(table).find('tbody tr').each(function(){
                $(this).attr('data-order_index',i);
                var value = $(this).find('td:nth-child('+settings.sort_on+')').html();
                if(value!=='' && isNaN(value)===true) {
                    data_type = 'string';
                }
                sortdata.push({
                    value: value,
                    order_index: i
                });
                
                i++;
            });
            
            /*
             * Sorting logic for columns with strings
             */
            if(data_type==='string') {
                sortdata.sort(function(a,b){
                    var value_a = a.value.toUpperCase();
                    var value_b = b.value.toUpperCase();
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
                sortdata.sort(function(a,b){
                    var value_a = parseFloat(a.value);
                    var value_b = parseFloat(b.value);
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
            var start_row = 0;
            var end_row = sortdata.length;
            if(settings.rows_per_page!==false) {
                settings.total_pages = Math.ceil(sortdata.length / settings.rows_per_page);
                if(settings.page===1) {
                    end_row = settings.rows_per_page;
                } else {
                    start_row = (settings.page-1) * settings.rows_per_page;
                    end_row = parseInt(start_row) + parseInt(settings.rows_per_page);
                }
            }
           
            this.update_pagers(start_row,end_row,sortdata.length);


            /*
             * Re-order/rendering of the table rows
             * -> All rows are re-ordered
             * -> Rows outside the "current page" are hidden
             * -> All even/odd rows are assigned classes
             */
            //var even_odd = 0;
            for(i=sortdata.length-1;i>=0;i--) {
                var tr = $(table).find('tr[data-order_index='+sortdata[i].order_index+']').remove();
                //$(tr).removeClass('row-even');
                //$(tr).removeClass('row-odd')
                if(i<start_row || i>=end_row) {
                    $(tr).hide();
                } else {
                    $(tr).show();
                    /*
                    if(even_odd % 2) {
                        $(tr).addClass('row-even');
                    } else {
                        $(tr).addClass('row-odd');
                    }
                    even_odd++;
                    */
                }
                
                $(tr).removeAttr('order_index');
                $(table).find('tbody').prepend(tr);
            }
            
            this.update_tr_styles();

        }

    }

    /*
     * Initialize the table sort object in
     * a jQuery way
     */
    jQuery.fn.sts = function(argument) {
            return this.each(function(){
                    var table = $(this);
                    if (table.data('sts')) {
                            return;
                    }
                    var sts_obj = new sts(this);
                    sts_obj.init();
                    table.data('sts',sts_obj);
            });
    };

    jQuery.fn.sts_refresh = function(argument) {
	this.each(function(){
	    var table = $(this);
	    if(typeof table.data('sts') !='undefined') {
	        table.data('sts').load_ajax();
	    }
	});
    };

    jQuery.fn.sts_loading = function(argument) {
	this.each(function(){
	    var table = $(this);
	    if(typeof table.data('sts') !='undefined') {
	        table.data('sts').show_loading();
	    }
	});
    };


});


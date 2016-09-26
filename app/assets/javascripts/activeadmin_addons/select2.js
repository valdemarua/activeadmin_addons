//= require select2
//= require_self

$(function() {
  setupSelect2(document);

  $(document).on('has_many_add:after', function(event, container){
    setupSelect2(container);
  });

  function setupSelect2(container) {
    var INVALID_PARENT_ID = -1;

    $('.select2-tags', container).each(function(i, el) {
      var model = $(el).data('model'),
          method = $(el).data('method'),
          selectOptions = {
            width: '80%',
            tags: $(el).data('collection')
          };

      if(!!model) {
        selectOptions.createSearchChoice = function() { return null; };
        var prefix = model + '_' + method;
        $(el).on('select2-selecting', onItemAdded);
        $(el).on('select2-removed', onItemRemoved);
      }

      $(el).select2(selectOptions);

      function onItemRemoved(event) {
        var itemId = '[id=\'' + prefix +  '_' + event.val + '\']';
        $(itemId).remove();
      }

      function onItemAdded(event) {
        var selectedItemsContainer = $("[id='" + prefix + "_selected_values']"),
          itemName = model + '[' + method + '][]',
          itemId = prefix + '_' + event.val;

        $('<input>').attr({
          id: itemId,
          name: itemName,
          type: 'hidden',
          value: event.val
        }).appendTo(selectedItemsContainer);
      }
    });

    $('select:not(.default-select)', container).each(function(i, el) {
      var firstOption = $('option', el).first(),
          allowClear  = false;

      if (firstOption.val() === "" && firstOption.text() === "") {
        allowClear = true;
      }

      if ($(el).closest('.filter_form').length > 0) {
        $(el).select2({
          width: 'resolve',
          allowClear: allowClear
        });
      } else {
        $(el).select2({
          width: '80%',
          allowClear: allowClear
        });
      }
    });

    $('.select2-ajax', container).each(function(i, el) {
      var url = $(el).data('url');
      var fields = $(el).data('fields');
      var displayName = $(el).data('display_name');
      var parent = $(el).data('parent');
      var model = $(el).data('model');
      var responseRoot = $(el).data('response_root');
      var collection = $(el).data('collection');
      var minimumInputLength = $(el).data('minimum_input_length');
      var order = fields[0] + '_desc';
      var parentId = $(el).data('parent_id') || INVALID_PARENT_ID;
      var selectInstance;

      console.error($(el))
      var object_type = $(el).data('object_type');

      var ajaxOptions = {
        url: url,
        dataType: 'json',
        delay: 250,
        data: function(term) {
          var textQuery = { m: 'or' };
          fields.forEach(function(field) {
            textQuery[field + '_contains'] = term;
          });

          var query =  {
            order: order,
            q: {
              groupings: [textQuery],
              combinator: 'and'
            }
          };

          if (!!parent) {
            query.q[parent + '_eq'] = parentId;
          }
          return query;
        },
        results: function(data, page) {
          if(data.constructor == Object) {
            data = data[responseRoot];
          }

          return {
            results: jQuery.map(data, function(resource) {
              return {
                id: resource[object_type],
                text: resource[displayName].toString()
              };
            })
          };
        },
        cache: true
      };

      var collectionOptions = function(query) {
        var data = { results: [] };
        collection.forEach(function(record) {
          var matched = fields.some(function(field) {
            var regex = new RegExp(query.term, 'i');
            return !!record[field] && !!record[field].match(regex);
          });

          if((!parent || record[parent] == parentId) && matched) {
            data.results.push({ id: record.id, text: record[displayName].toString() });
          }
        });
        query.callback(data);
      };

      var select2Config = {
        width: '80%',
        containerCssClass: 'nested-select-container',
        minimumInputLength: minimumInputLength,
        initSelection: function(element, callback) {
          var id = $(element).val();
          var text = $(element).data('selected') || '';
          $(element).data('selected', '');

          callback({
            id: id,
            text: text
          });
        }
      };

      if (!!parent) {
        var parentSelector = '#' + model + '_' + parent;

        $(el).parent().find(parentSelector).on('change', function(e) {
          selectInstance.val(null).trigger('change');
          parentId = e.val;

          if(!parentId) {
            parentId = INVALID_PARENT_ID;
          }
        });
      }

      if (collection) {
        select2Config.query = collectionOptions;
      } else {
        select2Config.ajax = ajaxOptions;
      }

      selectInstance = $(el).select2(select2Config);
    });
  }
});

var Comparator = function () {
  this.diff_array = [];
};

// Construct text label for object
Comparator.prototype.OpenTag = function (element_array) {
  var tag_text = "";

  if (element_array.name) {
    tag_text = "<" + element_array.raw + ">";
  } else {
    // Strip whitespace:
    //  tag_text = element_array.raw.replace(/\s+/g," ");
    tag_text = element_array.raw;
  }
  return tag_text;
};

Comparator.prototype.DoDiff = function (page_array, diff_id) {
  // Start from root of diff_array on new header
  this.diff_array = this.IterateElement(page_array, diff_id, this.diff_array);
};

Comparator.prototype.IterateElement = function (page_array, diff_id, diff_array) {
  var page_element, element_text, existing_key;

  // Search for matching value in existing elements
  var find_value = function (search_obj, value) {
    for (var p = 0, pl = search_obj.length; p < pl; p++) {
      if (search_obj[p].tag == value) {
        return p;
      }
    }
    return undefined;
  };

  // Parse page object
  for (var i = 0, il = page_array.length; i < il; i++) {
    page_element = page_array[i];

    // Check for element in current position of diff_array
    if (diff_array[i] === undefined) {
      diff_array.push([]);
    }

    // Create element text and check if already exists
    element_text = this.OpenTag(page_element);
    existing_key = find_value(diff_array[i], element_text);

    // Create new element if we havn't seen it before
    if (existing_key === undefined) {
      diff_array[i].push({
        tag : element_text,
        id_list : [diff_id]
      });
    }
    // Add id/element to the key if exists
    else {
      diff_array[i][existing_key].id_list.push(diff_id);
    }

    // Iterate over child elements
    if (page_element.children) {
      if (diff_array[i].children === undefined) {
        diff_array[i].children = [];
      }
      // Recursively IterateElement with children
      diff_array[i].children =
      this.IterateElement(page_element.children, diff_id, diff_array[i].children);
    }
  }
  return diff_array;
};

exports.Comparator = Comparator;

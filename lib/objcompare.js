var crc = require("./crc32");

var Comparator = function () {
  this.diff_array = {};
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
  var page_element, element_crc, element_text;

  for (var i = 0; i < page_array.length; i++) {
    page_element = page_array[i];

    if (diff_array[i] === undefined) {
      diff_array[i] = {};
    }

    // Create element text and get CRC
    element_text = this.OpenTag(page_element);
    element_crc = crc.crc32(element_text);

    // Compare existing element in diff_array[i] with iter_element
    if (diff_array[i][element_crc] === undefined) {
      // Create new element if needed
      diff_array[i][element_crc] = {
        tag : element_text,
        id_list : [diff_id]
      };
    }

    // Add id/element to the key if exists
    else {
      diff_array[i][element_crc].id_list.push(diff_id);
    }

    // Iterate over child elements
    if (page_element.children) {
      if (diff_array[i].children === undefined) {
        diff_array[i].children = {};
      }
      // Recursively IterateElement with children
      diff_array[i].children =
      this.IterateElement(page_element.children, diff_id, diff_array[i].children);
    }
  }
  return diff_array;
};

exports.Comparator = Comparator;

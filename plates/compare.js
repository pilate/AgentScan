var COMP = {
    
  // Zero pad a number
  ZP : function (num,count) {
    var num_padded = num + "";
    while(num_padded.length < count) {
      num_padded = "0" + num_padded;
    }
    return num_padded;
  },
    
  // Adds an event to every element with the given class name
  AddEventToClassName : function (class_name, event_type, event_function) {
    var element_list = document.getElementsByClassName(class_name);

    for (var link_num in element_list) {
      if (element_list[link_num].addEventListener) {
        element_list[link_num].addEventListener(event_type, event_function, false);
      }
    }
  },

  // 'Phader' function; returns array of each step between two hex color codes
  GetFadeArray : function (color_one, color_two, total_steps) {
    var step_holder, new_color;

    var diff_rgb = [];
    var new_rgb = [];
    var color_array = [];
    var split_regex = /.{1,2}/g;
    var one_rgb = color_one.match(split_regex);
    var two_rgb = color_two.match(split_regex);

    for (var i = 0; i <= total_steps; i++) {
      // Reset color var
      new_color = "";
      // Find difference between each hex color code
      for (var j = 0; j < one_rgb.length; j++) {
        diff_rgb[j] = parseInt(two_rgb[j], 16) - parseInt(one_rgb[j], 16);
        if (diff_rgb[j] !== 0) {
          step_holder = ( diff_rgb[j] / total_steps ) * i;
          new_rgb[j] = Math.floor(parseInt(one_rgb[j], 16) + step_holder);
        }
        else {
          new_rgb[j] = parseInt(two_rgb[j], 16);
        }
      }
      // Construct new color code and add to array
      for (var k = 0; k < new_rgb.length; k++) {
        new_color = new_color + this.ZP(new_rgb[k].toString(16),2);
      }
      color_array.push(new_color);
    }
    return color_array;
  },

  // Set "show/hide header" event handlers
  SetHeaderEvents : function () {
    var ClickEvent = function (e) {
      var header_element;
      var text_value = this.children[0].innerHTML;

      // Toggle header text
      if (text_value === "[Show Headers]") {
        this.children[0].innerHTML = "[Hide Headers]";
      }
      else {
        this.children[0].innerHTML = "[Show Headers]";
      }
      header_element = this.parentNode.getElementsByClassName("header_list")[0];

      // Toggle visibility of header list
      header_element.ToggleClass("hidden");
      e.stopPropagation();
    };

    this.AddEventToClassName("header_link", "click", ClickEvent);
  },

  // Set "show/hide children" event handlers
  SetTagEvents : function () {
    var ClickEvent = function () {
      var element, container_elements;

      container_elements = this.parentNode.getElementsByClassName("sub_container");
      for (element in container_elements) {
        if (container_elements[element].className) {
          container_elements[element].ToggleClass("hidden");
        }
      }
    };
    this.AddEventToClassName("tagbox", "click", ClickEvent);
  },

  // Set border colors of every tagbox element relative to the number of
  //  headers the parent contains
  SetBorderColors : function () {
    var tagbox, new_color, code_children, header_list;
    var steps = header_count - min_headers;
    var tagboxes = document.getElementsByClassName("tagbox");
    // Get fade array of red to green
    var color_array = this.GetFadeArray("C90A40", "A7E800", steps || 1);

    for (var box_count in tagboxes) {
      tagbox = tagboxes[box_count];
      if (tagbox.parentNode) {
        //header_list = tagbox.children[2];
        header_list = tagbox.getElementsByClassName("header_list")[0];
        //code_children = header_list.children.length - 1;
        code_children = header_list.getElementsByTagName("code").length;

        // Handle pages with only one result
        if (min_headers === header_count) {
          new_color = color_array[1];
        }
        else {
          new_color = color_array[code_children - min_headers];
        }
        tagbox.style.border = "2px solid #"+new_color;
        // Draw thread-lines to visually follow element flow
        /*
        if (tagbox.parentNode.getElementsByClassName("sub_container").length != 0 ||
              tagbox.parentNode.parentNode.id == "container") {
          tagbox.parentNode.style.borderLeft = "1px dotted #F4EBC3";
        }
        */
      }
    }
  }
};

// Element function to toggle a class, durp
Element.prototype.ToggleClass = function (class_name) {
  if (this.className.indexOf(class_name) === -1) {
    this.className = this.className + " " + class_name;
  }
  else {
    this.className = this.className.replace(class_name, "");
  }
};

// Main function block
// Do page formatting
(function () {
  var index_check = document.getElementById("url_form");

  // Javascript for index
  if (index_check) {
    index_check.addEventListener("submit", function () {
      document.getElementById("load_container").ToggleClass("hidden");
    }, false);
  }
  // Javasript for results
  else {
    COMP.SetHeaderEvents();
    COMP.SetTagEvents();
    COMP.SetBorderColors();
  }
})();
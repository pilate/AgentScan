// Copyright 2010, Paul Westin III

var COMP = {
  
  // Zero pad a color code (cheap but quick)
  ZP : function (num) {
    return (num.length == 1) ? "0" + num : num;
  },
    
  // Adds an event to every element with the given class name
  AddEventToClassName : function (class_name, event_type, event_function) {
    var element_list = document.getElementsByClassName(class_name);

    for (var i = 0, il = element_list.length; i < il; i++) {
      element_list[i].addEventListener(event_type, event_function, false);
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
      for (var j = 0, jl = one_rgb.length; j < jl; j++) {
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
      for (var k = 0, kl = new_rgb.length; k < kl; k++) {
        new_color = new_color + this.ZP(new_rgb[k].toString(16));
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
      var container_elements = this.parentNode.getElementsByClassName("sub_container");

      for (var i = 0, il = container_elements.length; i < il; i++) {
        container_elements[i].ToggleClass("hidden");
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

    for (var i = 0, il = tagboxes.length; i < il; i++) {
      tagbox = tagboxes[i];
      //header_list = tagbox.children[2];
      header_list = tagbox.getElementsByClassName("header_list")[0];
      //code_children = header_list.children.length - 1;
      code_children = header_list.getElementsByTagName("code").length;

      // Check for pages with only one result
      if (steps !== 0) {
        new_color = color_array[code_children - min_headers];
      }
      else {
        new_color = color_array[1];
      }
      tagbox.style.border = "2px solid #"+new_color;
    // Draw thread-lines for visual element flow
    /*
        if (tagbox.parentNode.getElementsByClassName("sub_container").length != 0 ||
              tagbox.parentNode.parentNode.id == "container") {
          tagbox.parentNode.style.borderLeft = "1px dotted #F4EBC3";
        }
        */
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
  var loading_element,
  doc = document,
  index_check = doc.getElementById("url_form"),
  error_check = doc.getElementsByClassName("error");

  // Javascript for index page
  if (index_check) {
    index_check.addEventListener("submit", function () {
      loading_element = doc.getElementById("load_container");
      loading_element.ToggleClass("hidden");
    }, false);
  }
  // Javascript for error page
  else if (error_check.length) {
  }
  // Javasript for results page
  else {
    COMP.SetHeaderEvents();
    COMP.SetTagEvents();
    COMP.SetBorderColors();
  }
})();
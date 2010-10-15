// Copyright 2010, Paul Westin III

var COMP = {
  
  // Adds an event to every element with the given class name
  AddEventToClassName : function (class_name, event_type, event_function) {
    var element_list = document.getElementsByClassName(class_name);

    for (var i = 0, il = element_list.length; i < il; i++) {
      element_list[i].addEventListener(event_type, event_function, false);
    }
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


  SetBorderColors : function () {
  //tagbox.style.border = "2px solid #"+new_color;
  // Draw thread-lines for visual element flow
  /*
        if (tagbox.parentNode.getElementsByClassName("sub_container").length != 0 ||
              tagbox.parentNode.parentNode.id == "container") {
          tagbox.parentNode.style.borderLeft = "1px dotted #F4EBC3";
        }
        */
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
  //COMP.SetBorderColors();
  }
})();
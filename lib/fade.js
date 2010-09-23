
// Zero pad a color code (cheap but quick)
var ZP = function (num) {
  return (num.length == 1) ? "0" + num : num;
};

// 'Phader' function; returns array of each step between two hex color codes
exports.GetArray = function (color_one, color_two, total_steps) {
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
      new_color = new_color + ZP(new_rgb[k].toString(16));
    }
    color_array.push(new_color);
  }
  return color_array;
};
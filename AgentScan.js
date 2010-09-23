var http = require("http"),
url = require("url"),
fs = require("fs"),
crc = require("./lib/crc32"),
nodehtml = require("./lib/node-htmlparser"),
objcompare = require("./lib/objcompare"),
jade = require("./lib/jade"),
//sys = require("sys"),
spawn = require("child_process").spawn,
fade = require("./lib/fade"),
config = require("./config").CONFIG;

var AGENT_LIST;

var AgentServer = function () {
  this.static_cache = {};
};

var AgentScanner = function (test_url, response_obj) {
  this.page_comparison = new objcompare.Comparator();
  this.redir_comparison = new objcompare.Comparator();
  this.checksum_list = {};
  this.split_url = test_url;
  this.response_object = response_obj;

  var connection_count = 0;

  this.GetConnections = function () {
    return connection_count;
  };

  this.AddConnection = function () {
    connection_count = connection_count + 1;
  };
  this.RemConnection = function () {
    connection_count = connection_count - 1;
    // Last connection closed, call finisher
    if (connection_count === 0) {
      this.OutputResults();
    }
  };
};

// Format results for output
AgentScanner.prototype.OutputResults = function () {
  var key_count = 0;
  var min_tags = 0;
  var agent_count;
  var that = this;

  for (var key in this.checksum_list) {
    key_count = key_count + 1;
    agent_count = this.checksum_list[key].length;

    // Find element with smallest number of related browser headers
    if ((min_tags === 0) || agent_count < min_tags) {
      min_tags = agent_count;
    }
  }

  this.response_object.writeHead(200, {
    "Content-Type": "text/html",
    "Content-Encoding": "gzip"
  });

  var steps = AGENT_LIST.length - min_tags;

  // Get fade array of red to green
  var color_array = fade.GetArray("C90A40", "A7E800", steps || 1);
  
  // Render results template
  jade.renderFile("plates/results.jade",
  {
    locals: {
      fade_array: color_array,
      diff_obj: this.page_comparison.diff_array,
      redir_obj: this.redir_comparison.diff_array,
      diff_pages: key_count,
      tested_page: url.format(this.split_url),
      header_count: AGENT_LIST.length,
      min_headers: min_tags
    }
  },
  function (err, html) {
    var random_data = function (size_of) {
      var random_return = "";

      for (var i = 0; i<size_of; i++) {
        random_return = random_return + String.fromCharCode(97 + Math.round(Math.random() * 25));
      }
      return random_return;
    };

    var new_file = random_data(6);

    // Dont create file if something went wrong
    if (!html) {
      return;
    }

    // gzip before sending response (node+gzip stdio was broken)
    fs.writeFile(new_file, html, function (err) {
      var gzip = spawn("gzip", ["-9", new_file]);

      // read gzipped file when program exits
      gzip.on("exit", function () {
        fs.readFile(new_file + ".gz", function (err, data) {
          // send gzipped data and delete file
          that.response_object.end(data);
          fs.unlink(new_file + ".gz", function (err) {});
        });
      });
    });
  //fs.writeFile("results.html", html);
  //fs.writeFile("results2.txt", sys.inspect(that.page_comparison.diff_array, false, null));
  });
};



// Add checksum to array; create array on first entry
AgentScanner.prototype.AppendChecksum = function (browser_agent, checksum) {
  var existing = this.checksum_list[checksum];

  if (existing) {
    this.checksum_list[checksum].push(browser_agent);
  }
  else {
    this.checksum_list[checksum] = [browser_agent];
  }
};

// Get page using the user-agent parameter
AgentScanner.prototype.GetPage = function (browser_agent) {
  var out_url;
  var that = this;

  // Generic error function
  var ConnectionError = function () {
    that.AppendChecksum(browser_agent, "Error");
    that.RemConnection();
  };

  // Rate limiting
  if (this.GetConnections() === config.max_connections) {
    process.nextTick(function () {
      that.GetPage(browser_agent);
    });
    return;
  }
  // Construct request URL string from parsed URL
  out_url = this.split_url.pathname;
  if (this.split_url.search) {
    out_url = out_url + this.split_url.search;
  }

  this.AddConnection();

  // Create new outgoing request
  var new_client = http.createClient(this.split_url.port || 80, this.split_url.host);
  var new_request = new_client.request("GET", out_url || "/",
  {
    "Host":this.split_url.host,
    "User-Agent":browser_agent,
    "Accept":"text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-us"
  }
  );
  new_client.on("error", ConnectionError);

  new_request.end();

  new_request.on("response", function (response) {
    var handler, parser;
    var page_data = "";

    // Adds "location:" redirects to compared DOM as a tag for display purposes

    if (response.headers.location) {
      var redirect_data = "<Redirect> Location: " + response.headers.location + "</Redirect>";

      handler = new nodehtml.DefaultHandler(function () {},{});
      parser = new nodehtml.Parser(handler);
      parser.parseComplete(redirect_data);
      that.redir_comparison.DoDiff(handler.dom, browser_agent);
    }
   
    // Collect all data before parsing
    response.on("data", function (chunk) {
      page_data = page_data + chunk;
    });

    response.on("end", function () {
      var handler, parser;
      var page_checksum = crc.crc32(page_data);

      // Keep list of page checksums
      that.AppendChecksum(browser_agent, page_checksum);

      // Handler for html parser
      handler = new nodehtml.DefaultHandler(function () {},{
        ignoreWhitespace: true
      });
      parser = new nodehtml.Parser(handler);
      parser.parseComplete(page_data);

      // Run diff, use browser_agent as an 'id'
      //that.page_comparison.IterateElement(handler.dom, browser_agent, that.page_comparison.diff_array);
      that.page_comparison.DoDiff(handler.dom, browser_agent);
      
      // End connection as late as possible, output starts at 0
      that.RemConnection();
    });
    response.on("error", ConnectionError);
  });
};

// Main scan loop; Iterate over agents
AgentScanner.prototype.AgentScan = function () {
  var agent_header;

  for (var i = 0, il = AGENT_LIST.length; i < il; i++) {
    agent_header = AGENT_LIST[i];
    this.GetPage(agent_header);
  }
};

// Route page displays, probably not very efficient
//   handles caching of each template
AgentServer.prototype.RenderPage = function (page_name, response_object) {
  var that = this;
  
  var ReturnPage = function (response_object, response_data, response_code, content_type) {
    response_object.writeHead(response_code, {
      "Content-Type": content_type
    });
    response_object.end(response_data, "binary");
  };

  // hackish directory handling for reverse proxy
  if (page_name === "/" || page_name === config.working_dir + "/") {
    page_name = "index";
  }

  switch (page_name) {
    // check cache and render index page
    case "index":
      if (this.static_cache.index) {
        ReturnPage(response_object, this.static_cache.index, 200, "text/html");
      }
      else {
        jade.renderFile("plates/index.jade", {}, function (err, html) {
          that.static_cache.index = html;
          ReturnPage(response_object, html, 200, "text/html");
        });
      }
      break;
    case "error":
      if (this.static_cache.error) {
        ReturnPage(response_object, this.static_cache.error, 500, "text/html");
      }
      jade.renderFile("plates/error.jade",
      {
        locals: {
          error_message: "There was a problem parsing the requested URL."
        }
      },
      function (err, html) {
        that.static_cache.error = html;
        ReturnPage(response_object, html, 500, "text/html");
      });
      break;

    // Default switch handles static files and 404
    default:
      // List of accepted static files and their content type
      var accepted_files = {
        "/plates/compare.css": "text/css",
        "/plates/compare.js": "text/javascript",
        "/plates/loading.gif": "image/gif"
      };

      var response_code, return_buffer;
      var content_type = "text/html";

      page_name = page_name.replace(config.working_dir, "");

      // Check if file is acceptable, check working dir (hackish)
      if (page_name in accepted_files) {
        response_code = 200;
        content_type = accepted_files[page_name];
        // Check static cache for render
        if (this.static_cache[page_name]) {
          return_buffer = this.static_cache[page_name];
          ReturnPage(response_object, return_buffer, response_code, content_type);
        }
        else {
          // Read file and add to cache
          fs.readFile(page_name.substr(1), "binary", function (err, data) {
            that.static_cache[page_name] = data;
            ReturnPage(response_object, data, response_code, content_type);
          });
        }
      }
      
      // Return 404 if not static or index
      else {
        if (this.static_cache["404"]) {
          ReturnPage(response_object, this.static_cache["404"], 404, "text/html");
        }
        jade.renderFile("plates/error.jade",
        {
          locals: {
            error_message: "The requested page was not found."
          }
        },
        function (err, html) {
          that.static_cache["404"] = html;
          ReturnPage(response_object, html, 404, "text/html");
        });
      }
      break;
  }  
};

AgentServer.prototype.StartServer = function () {
  var that = this;

  var http_server = http.createServer(function (request, response) {
    var post_url, AS;
    var post_data = "";
    // Daring Fireball URL regex
    var url_regex = /\b(([\w-]+:\/\/{1})[^\s()<>]+(?:\([\w\d]+\)|([^[:punct:]\s]|\/)))/i;

    // Render index request
    if (request.method === "GET") {
      that.RenderPage(request.url, response);
    }
    // Handle submissions
    else if ((request.method === "POST") && (request.url.replace(config.working_dir, "") === "/scan")) {
      // Collect all data before starting
      request.on("data", function (chunk) {
        post_data = post_data + chunk;
      });
      request.on("end", function () {
        // read url from post data; parse
        post_url = unescape(post_data).substr(4);

        // Check if url matches regex
        if (url_regex.test(post_url) || url_regex.test(post_url + "/")) {

          // Run agent scanner on url
          AS = new AgentScanner(url.parse(post_url), response);
          AS.AgentScan();
        }
        // Malformed URL, abort
        else {
          that.RenderPage("error", response);
        }
      });
    }
  });
  http_server.listen(parseInt(config.port_number, 10));

  console.log("HTTP Server started on port " + config.port_number + ".");
};

// Read agents into array before starting
fs.readFile(config.agent_file, "ascii", function (err, data) {
  AGENT_LIST = data.replace(/\r/g,"").split("\n");

  var AServer = new AgentServer();
  AServer.StartServer();
});





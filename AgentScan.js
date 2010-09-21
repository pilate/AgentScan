var http = require("http"),
url = require("url"),
fs = require("fs"),
crc = require("./lib/crc32"),
nodehtml = require("./lib/node-htmlparser"),
objcompare = require("./lib/objcompare"),
jade = require("./lib/jade"),
spawn = require("child_process").spawn;

var config = require("./config").CONFIG;

var AgentServer = function () {
  this.static_cache = {};
};

var AgentScanner = function (test_url, response_obj) {
  this.compare_object = new objcompare.Comparator();
  this.agent_list = [];
  this.checksum_list = {};
  this.connection_count = 0;
  this.split_url = test_url;
  this.response_object = response_obj;
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

  // Render results template
  jade.renderFile("plates/results.jade",
  {
    locals: {
      diff_obj: this.compare_object.diff_array,
      diff_pages: key_count,
      tested_page: url.format(this.split_url),
      header_count: this.agent_list.length,
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
    // gzip before sending response (node+gzip stdio was broken)
    fs.writeFile(new_file, html, function (err) {
      var gzip = spawn("gzip", ["-9", new_file]);

      // read gzipped file when program exits
      gzip.on("exit", function () {
        fs.readFile(new_file + ".gz", function (err, data) {
          // send gzipped data and delete file
          that.response_object.end(data);
          fs.unlinkSync(new_file + ".gz");
        });
      });
    });
  //fs.writeFileSync("results.html", html);
  //fs.writeFileSync("results2.txt", sys.inspect(that.compare_object.diff_array, false, null));
  });
};

// Read agents into array from file
AgentScanner.prototype.ReadAgents = function () {
  var raw_agents = fs.readFileSync(config.agent_file, "ascii");
  this.agent_list = raw_agents.replace(/\r/g,"").split("\n");
};

// Move these to private? Probably
AgentScanner.prototype.AddConnection = function () {
  this.connection_count = this.connection_count + 1;
};
AgentScanner.prototype.RemConnection = function () {
  this.connection_count = this.connection_count - 1;
  // Last connection closed, call finisher
  if (this.connection_count === 0) {
    this.OutputResults();
  }
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
  if (this.connection_count === config.max_connections) {
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
    var complete_data = "";

    // Adds "location:" redirects to compared DOM as a tag for display purposes
    /*
    if (response.headers.location) {
      complete_data = "<Redirect>Location: " + response.headers.location + "</Redirect>";
    }
    */
   
    // Collect all data before parsing
    response.on("data", function (chunk) {
      complete_data = complete_data + chunk;
    });

    response.on("end", function () {
      var handler, parser;
      var page_checksum = crc.crc32(complete_data);

      that.RemConnection();
      
      // Keep list of page checksums
      that.AppendChecksum(browser_agent, page_checksum);

      // Handler for html parser
      handler = new nodehtml.DefaultHandler(function () {},
      {
        ignoreWhitespace: true
      }
      );
      parser = new nodehtml.Parser(handler);
      parser.parseComplete(complete_data);

      // Run diff, use browser_agent as an 'id'
      //that.compare_object.IterateElement(handler.dom, browser_agent, that.compare_object.diff_array);
      that.compare_object.DoDiff(handler.dom, browser_agent);

    });
    response.on("error", ConnectionError);
  });
};

// Main scan loop; Iterate over agents
AgentScanner.prototype.AgentScan = function () {
  var agent_count, agent_header;

  for (agent_count in this.agent_list) {
    agent_header = this.agent_list[agent_count];
    this.GetPage(agent_header);
  }
};


// Returns a static file, content type, and a response code
AgentServer.prototype.GetStaticFile = function (try_file) {
  // List of accepted static files and their content type
  var accepted_files = {
    "/plates/compare.css": "text/css",
    "/plates/compare.js": "text/javascript",
    "/plates/loading.gif": "image/gif"
  };

  var response_code, return_buffer;
  var content_type = "text/html";

  try_file = try_file.replace(config.working_dir, "");

  // Check if file is acceptable, check working dir (hackish)
  if (try_file in accepted_files) {
    response_code = 200;
    content_type = accepted_files[try_file];
    // Check static cache for render
    if (this.static_cache[try_file]) {
      return_buffer = this.static_cache[try_file];
    }
    else {
      // Read file and add to cache
      return_buffer = fs.readFileSync(try_file.substr(1), "binary");
      this.static_cache[try_file] = return_buffer;
    }
  }
  else {
    return_buffer = "Not Found";
    response_code = 404;
  }
  return [return_buffer, content_type, response_code];
};

AgentServer.prototype.StartServer = function () {
  var that = this;

  var http_server = http.createServer(function (request, response) {
    var static_file, post_url, AS;
    var post_data = "";
    // Daring Fireball URL regex
    var url_regex = /\b(([\w-]+:\/\/?|www[.])[^\s()<>]+(?:\([\w\d]+\)|([^[:punct:]\s]|\/)))/i;

    // Render index request
    if (request.method === "GET") {
      // hackish directory handling for reverse proxy
      if (request.url === "/" || request.url === config.working_dir + "/") {
        response.writeHead(200, {
          "Content-Type": "text/html"
        });
        jade.renderFile("plates/index.jade", {}, function (err, html) {
          response.end(html);
        });
      }
      else {
        static_file = that.GetStaticFile(request.url);
        response.writeHead(static_file[2], {
          "Content-Type": static_file[1]
        });
        response.end(static_file[0], "binary");
      }
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
          AS.ReadAgents();
          AS.AgentScan();
        }
        else {
          // Malformed URL, abort
          response.writeHead(200, {
            "Content-Type": "text/html"
          });
          response.end("There was a problem parsing the requested url.");
        }
      });
    }
  });
  http_server.listen(parseInt(config.port_number, 10));

  console.log("HTTP Server started on port " + config.port_number + ".");
};

var AServer = new AgentServer();
AServer.StartServer();
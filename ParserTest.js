var http = require("http");
var sys = require("sys");
var url = require("url");
var fs = require("fs");
var crc = require("./lib/crc32");
var nodehttp = require("./lib/node-htmlparser");
var objcompare = require("./lib/objcompare");

var AgentScanner = function () {
    this.agent_file = "./agents/agents_common.txt";
    this.max_connections = 20;

    this.agent_list = [];
    this.checksum_list = {};
    this.connection_count = 0;
    this.split_url = "";
};

// Format results for output file
// todo:
//   Use templates
//   Manually diff the results
AgentScanner.prototype.OutputResults = function () {
    var page_text = "Results from "+url.format(this.split_url)+":\r\n\r\n";
    
    for (var key in this.checksum_list) {
        page_text = page_text + key + "\r\n";
        for (var key_two in this.checksum_list[key]) {
            page_text = page_text + "\t\t" + this.checksum_list[key][key_two] + "\r\n";
        }
    }
    fs.writeFileSync("results.txt", page_text);
};

// Read agents into array from file
AgentScanner.prototype.ReadAgents = function () {
    var raw_agents = fs.readFileSync(this.agent_file, "ascii");
    this.agent_list = raw_agents.replace(/\r/g,"").split("\n");
};

AgentScanner.prototype.AddConnection = function () {
    this.connection_count = this.connection_count + 1;

};
AgentScanner.prototype.RemConnection = function () {
    this.connection_count = this.connection_count - 1;

};

// Add checksum to array, create array on first entry
AgentScanner.prototype.AppendChecksum = function (browser_agent, checksum) {
    var existing = this.checksum_list[checksum];

    if (existing) {
        this.checksum_list[checksum].push(browser_agent);
    }
    else {
        this.checksum_list[checksum] = [browser_agent];
    }
};

// Get page using the passed-in user-agent
AgentScanner.prototype.GetPage = function (browser_agent) {
    var out_url;
    var self = this;

    // Generic error function
    var ConnectionError = function () {
        self.AppendChecksum(browser_agent, "Error");
        self.RemConnection();
    };

    // Rate limiting
    if (self.connection_count === self.max_connections) {
        process.nextTick(function () {
            self.GetPage(browser_agent);
        });
        return;
    }

    // Construct request URL string from parsed URL
    out_url = this.split_url.pathname;
    if (this.split_url.search) {
        out_url = out_url + this.split_url.search;
    }

    this.AddConnection();
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

        response.on("data", function (chunk) {
            complete_data = complete_data + chunk;
        });
        response.on("end", function () {
            //--------------------------------------------------------------
            var handler = new nodehttp.DefaultHandler(function () {},
            {
                ignoreWhitespace: true
            }
            );
            var parser = new nodehttp.Parser(handler);
            var compar = new objcompare.Comparator();

            parser.parseComplete(complete_data);
            compar.DoDiff(handler.dom, browser_agent);

            console.log(sys.inspect(compar.diff_array, false, null));
            sys.puts(sys.inspect(handler.dom, false, null));
            //--------------------------------------------------------------

            var page_checksum = crc.crc32(complete_data);

            self.RemConnection();

            self.AppendChecksum(browser_agent, page_checksum);

            // Last connection closed, call finisher
            if (self.connection_count === 0) {
                self.OutputResults();
            }
        });
        response.on("error", ConnectionError);

    });
};

// Grab page with first header
AgentScanner.prototype.AgentScan = function (test_url) {
    this.split_url = url.parse(test_url);
    this.GetPage(this.agent_list[0]);

};

if (process.argv.length > 2) {
    var AS = new AgentScanner();

    console.log(process.argv[2]);
    AS.ReadAgents();
    AS.AgentScan(process.argv[2]);
}
else {
    var FILENAME = __filename.replace(__dirname + "/", "");
    console.log("Usage: node.js "+FILENAME+" <url>");
}


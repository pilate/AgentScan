var CONFIG = {
  // Server port
  port_number: 9900,

  // Maximum number of open connections per scan
  max_connections: 30,

  // Text file containing a list of User-Agent headers to test
  agent_file: "agents/agents_common.txt",

  // Relative path from root directory; For reverse proxying.
  // ie: "http://www.some.com/htmlcomp" would require:
  working_dir: "/htmlcomp"
};

exports.CONFIG = CONFIG;
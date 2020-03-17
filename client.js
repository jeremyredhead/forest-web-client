function bind(context, func) {
	return (context[func] || func).bind(context)
//	func.bind ? func.bind(context) 
//		      : context[func].bind(context)
}

function ForestClient(url, extensions) {
	this.sock = null
	this.url = url
	// actually, i'd need two props, one for requested exts, 
	// and one for active exts. is this even worth implementing?
	this.extensions = extensions
	
	this.tree = {} // or null?
}

// Helpers

ForestClient.fn = ForestClient.prototype

ForestClient.fn.init = function() {
	var sock = this.sock = new WebSocket(this.url)
	sock.onopen    = bind(this, 'hello')
	sock.onclose   = bind(this, 'onclose') // try again
	sock.onerror   = bind(this, 'onerror') // onerror seems kinda useless? 
	sock.onmessage = bind(this, 'onupdate') // hmm
	return this
}

ForestClient.fn.send = function(msg) {
	this.sock.send(JSON.stringify(msg))
}

ForestClient.fn.getBranch = function(path) {
	var node = this.tree
	path.forEach(id => node = node.children[id])
	return node
}

ForestClient.fn.doNode = function(type, path, text) {
    // bad name? over-abstracted?
	
	// node.data.path || getPath(node) || node.toJSON
	
	// note: JSON.stringify omits undefined properties
	this.send({type: type, path: path, text: text})
}

// Client Messages

ForestClient.fn.hello = function() {
	this.send({type: 'hello', extensions: []})
}

ForestClient.fn.edit = function(node, text) {
	this.send({type: 'edit', path: node, text: text})
}

ForestClient.fn.delete = function(node) {
	this.send({type: 'delete', path: node})
}

ForestClient.fn.reply = function(node, text) {
	this.send({type: 'reply', path: node, text: text})
}

ForestClient.fn.act = function(node) {
	this.send({type: 'act', path: node})
}

// Server Messages

ForestClient.fn.onerror = event => console.log('WS error:', event)

ForestClient.fn.onclose = function(e) {
	console.log(`WS closed ${e.wasClean ? '' : 'un'}cleanly with code ${e.code} for reason: ${e.reason}`)
}

ForestClient.fn.onupdate = function(event) {
	var msg = JSON.parse(event.data)
	var path = msg.path.slice() // make a copy
	if (msg.type === 'hello') {
		this.tree = msg.node 
		return
	}
	// else assume type == update 
	// premature optimization?
	if      (path.length === 0) this.tree = msg.node
	else if (path.length === 1) this.tree.children[path] = msg.node
	else {
		let last = path.pop()
		this.getBranch(path)[last] = msg.node
	}
}

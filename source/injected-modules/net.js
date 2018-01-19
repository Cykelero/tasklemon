const fetch = require('node-fetch');

let net = module.exports;

net.getText = async function(url, options) {
	return (await fetch(url, options)).text();
};

net.getJSON = async function(url, options) {
	return (await fetch(url, options)).json();
};

net.getDOM = async function(url, options) {
	const JSDOM = require('jsdom').JSDOM;
	
	const pageText = await net.getText(url, options);
	const parsedPage = new JSDOM(pageText, {url: url});
	
	return parsedPage.window.document;
};

net.fetch = fetch;

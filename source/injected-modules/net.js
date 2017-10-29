const fetch = require('node-fetch');

let net = module.exports;

net.getText = async function(url) {
	return (await fetch(url)).text();
};

net.getJSON = async function(url) {
	return (await fetch(url)).json();
};

net.getDOM = async function(url) {
	const JSDOM = require('jsdom').JSDOM;
	const pageText = await net.getText(url);
	const parsedPage = new JSDOM(pageText, {url: url});
	return parsedPage.window.document;
};

net.fetch = fetch;

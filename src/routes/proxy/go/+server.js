import { json } from '@sveltejs/kit';
import * as cheerio from 'cheerio';


export let GET = async ({url}) => {
	let ourUrl = "/proxy/go?";
	//url is the url that we are trying to proxy.
	let newUrl = url.search.substring(1);

	//get the domain from the proxy url 
	let domain = "";
	let dmc = newUrl.indexOf("/", 8);
	if (dmc == -1) {
		dmc = newUrl.length;
	}
	domain = newUrl.substring(0, dmc);

	let relativeUrl = newUrl.substring(8 + domain.length);


	let fetchrq = await fetch(newUrl);
	let reqType = fetchrq.headers.get("content-type");

	let html;


	//now we have the html, and things get a little tricky. We need to replace all the links with our own. 
	//We also need to replace all the scripts with our own.
	//We also need to replace all the styles with our own.
	//We also need to replace all the images with our own.
	//you get it by now.
	console.log(reqType)
	if(reqType.startsWith("text/html")){
		html = await fetchrq.text()
		return new Response(html, {
			headers: Object.fromEntries(fetchrq.headers.entries())
		});
	} else if(reqType.startsWith("image")) {
		html = await fetchrq.blob()
		console.log("image")
		return new Response(html, {
			headers: Object.fromEntries(fetchrq.headers.entries())
		})
	} else {
		html = await fetchrq.text();
	} 

	let fixUrl = (url) => {
		if (url.startsWith("/")) {
			return ourUrl + domain + url;
		}
		if (url.startsWith(".")) {
			console.log(url)
			console.log(ourUrl + domain + relativeUrl + url.substring(1))
			return ourUrl + domain + relativeUrl + url.substring(1);
		}
		return `/proxy/go?${url}`;
	}


	//parse with cherrio to get the html
	let parsed = cheerio.load(html);
	parsed('a').each((i, link) => {
		let href = link.attribs.href;
		link.attribs.href = fixUrl(href);
	});

	parsed('script').each((i, link) => {
		if(link.attribs.src){
			link.attribs.src = fixUrl(link.attribs.src);
		}
	});

	parsed('link').each((i, link) => {
		if(link.attribs.href){
			link.attribs.href = fixUrl(link.attribs.href);
		}
	});

	parsed('img').each((i, link) => {
		if(link.attribs.src){
			link.attribs.src = fixUrl(link.attribs.src);
		}
	});

	return new Response(parsed.root().html(), {
		headers: {
			'content-type': reqType,
		}
	});
}
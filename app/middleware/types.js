export default function (req, res, next) {
	const status = getStatus(req);

	if (status) {
		res.status(status);
		res.end();
		return;
	}

	next();
}

function getStatus(req) {
	if (!req.accepts('json'))
		return 406;

	if (Number(req.header('Content-Length')) && !req.is('json'))
		return 415;
}

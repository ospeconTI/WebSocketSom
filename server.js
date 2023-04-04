/** @format */

var WebSocketServer = require("websocket").server;
var http = require("http");

var server = http.createServer(function (request, response) {
    console.log(new Date() + " Received request for " + request.url);
    response.writeHead(404);
    response.end();
});
server.listen(8080, function () {
    console.log(new Date() + " Server is listening on port 8080");
});

wsServer = new WebSocketServer({
    httpServer: server,
    // You should not use autoAcceptConnections for production
    // applications, as it defeats all standard cross-origin protection
    // facilities built into the protocol and the browser.  You should
    // *always* verify the connection's origin and decide whether or not
    // to accept it.
    autoAcceptConnections: false,
});

let originIsAllowed = (origin) => {
    // put logic here to detect whether the specified origin is allowed.
    return true;
};

let formatIsCorrect = (url) => {
    return url.query.IdCaja != null;
};

let cajas = [];

wsServer.on("request", (request) => {
    if (!originIsAllowed(request.origin)) {
        // Make sure we only accept requests from an allowed origin
        request.reject();
        console.log(new Date() + " Connection from origin " + request.origin + " rejected.");
        return;
    }

    if (!formatIsCorrect(request.resourceURL)) {
        request.reject();
        console.log(new Date() + " Connection from origin " + request.origin + " format incorrect.");
        return;
    }

    let connection = request.accept("", request.origin);

    connection.IdCaja = request.resourceURL.query.IdCaja;

    cajas.push(connection);

    console.log(new Date() + " Connection accepted. IdCaja=" + connection.IdCaja);

    connection.on("message", (message) => {
        if (message.type === "utf8") {
            try {
                let messageJSON = JSON.parse(message.utf8Data);

                if (messageJSON.IdCaja == null) throw "el mensaje no tiene caja de destino (IdCaja)";

                const target = cajas.find((c) => c.IdCaja == messageJSON.IdCaja);

                if (target == null) throw "la caja de destino se encuentra desconectada";

                target.send(JSON.stringify(messageJSON));
            } catch (ex) {
                connection.sendUTF("Error:" + ex);
            }
        } else if (message.type === "binary") {
            /*  console.log("Received Binary Message of " + message.binaryData.length + " bytes");
            connection.sendBytes(message.binaryData); */
        }
    });
    connection.on("close", (reasonCode, description) => {
        cajas = cajas.filter((c) => c.IdCaja != connection.IdCaja);
        console.log(new Date() + " Connection closed. IdCaja=" + connection.IdCaja);
    });
});

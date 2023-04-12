/** @format */

let WebSocketServer = require("websocket").server;
let WebSocketClient = require("websocket").client;
let http = require("http");

let client = new WebSocketClient();
let clientConnection = null;
client.on("connect", (connection) => {
    console.log("WebSocket Client Connected");
    clientConnection = connection;
    connection.on("error", (error) => {
        console.log("Connection Error: " + error.toString());
    });
    connection.on("close", () => {
        console.log("echo-protocol Connection Closed");
    });
    connection.on("message", (message) => {
        if (message.type === "utf8") {
            console.log("Received: '" + message.utf8Data + "'");
        }
    });
});

let serverAPI = http.createServer();
serverAPI.on("request", async (request, response) => {
    console.log(new Date() + " Received request for " + request.url);
    let IdCaja = request.url.replace("/?IdCaja=", "");

    clientConnection.sendUTF('{"IdCaja":' + IdCaja + "}");
    response.writeHead(200);
    response.end();
});

serverAPI.listen(8090, () => {
    console.log(new Date() + " Server is listening on port 8090");
    client.connect("ws://localhost:8080/?IdCaja=-99", "");
});

let server = http.createServer();
server.on("request", async (request, response) => {
    console.log(new Date() + " Received request for " + request.url);
    response.writeHead(404);
    response.end();
});
server.listen(8080, () => {
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

    connection.on("message", async (message) => {
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

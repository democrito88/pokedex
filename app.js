//npm install express path socket.io ejs follow-redirects url bootstrap-icons --save
const express = require('express');
const path = require('path');

const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);
const https = require('follow-redirects').https;
const url = require('url');

//usa a pasta 'public' como pasta padrão
app.use(express.static(path.join(__dirname, 'public')));
app.set("views", path.join(__dirname, 'public'));
app.engine("html", require("ejs").renderFile);
app.set("view engine", "html");


app.get("/", function (req, res) {
    res.render("index.html")
});

var options = {
    'method': 'GET',
    'hostname': 'pokeapi.co',
    'path': '/api/v2/pokemon/',
    'headers': {
    },
    'maxRedirects': 50
};

io.on("connection", function (socket) {
    console.log("Recebendo conexão com socket de id: " + socket.id)

    socket.on("abrir", function (req) {
        var req = https.request(options, function (res) {
            var pokemons = [];

            res.on("data", function (pokemon) {
                
                pokemons.push(pokemon);
            });

            res.on("end", function (pokemon) {
                var body = Buffer.concat(pokemons);
                socket.emit('abertura', body.toString());
            });

            res.on("error", function (error) {
                console.error(error);
            });
        });

        req.end();
    });

    socket.on("paginacao", function (req) {
        options.path = "/api/v2/pokemon/?offset="+req.offset+"&limit="+req.limit;
        var req = https.request(options, function (res) {
            var pokemons = [];

            res.on("data", function (pokemon) {
                
                pokemons.push(pokemon);
            });

            res.on("end", function (pokemon) {
                var body = Buffer.concat(pokemons);
                socket.emit('passaPagina', body.toString());
            });

            res.on("error", function (error) {
                console.error(error);
            });
        });

        req.end();
    });

    socket.on("pedirDetalhes", function(req){
        var pokemonOptions = {
            'method': 'GET',
            'hostname': 'pokeapi.co',
            'path': '/api/v2/pokemon/'+req.id,
            'headers': {
            },
            'maxRedirects': 20
        };
    
        var request = https.request(pokemonOptions, function (resource) {
            var colecao = [];
    
            resource.on("data", function (item) {
                colecao.push(item);
            });
    
            resource.on("end", function (item) {
                var body = Buffer.concat(colecao);
                //Busca detalhada da espécie
                var pokemonSpeciesOptions = {
                    'method': 'GET',
                    'hostname': 'pokeapi.co',
                    'path': '/api/v2/pokemon-species/'+req.id,
                    'headers': {
                    },
                    'maxRedirects': 20
                };
            
                var requestSpecies = https.request(pokemonSpeciesOptions, function (resourceSpecies) {
                    var colecaoSpecies = [];
            
                    resourceSpecies.on("data", function (itemSpecies) {
                        colecaoSpecies.push(itemSpecies);
                    });
            
                    resourceSpecies.on("end", function (itemSpecies) {
                        var bodySpecies = Buffer.concat(colecaoSpecies);
                        socket.emit('enviarDetalhes', {pokemon: body.toString(), pokemonSpecies: bodySpecies.toString()});
                    });
            
                    resourceSpecies.on("error", function (error) {
                        console.error(error);
                    });
                });
            
                requestSpecies.end();
                //------------------
            });
    
            resource.on("error", function (error) {
                console.error(error);
            });
        });
    
        request.end();
    });

    socket.on("pedirTipo", function(req){
        var pokemonTipo = {
            'method': 'GET',
            'url': req.url,
            'maxRedirects': 20
        };
    
        var request = https.request(pokemonTipo, function (resource) {
            var colecao = [];
    
            resource.on("data", function (item) {
                colecao.push(item);
            });
    
            resource.on("end", function (item) {
                var body = Buffer.concat(colecao);
                socket.emit('enviarTipo', {tipo: body.toString()});
            });
    
            resource.on("error", function (error) {
                console.error(error);
            });
        });
    
        request.end();
    });
});

app.get('/pokemon/:id', function(req, res) {
    res.render('pokemon.html');
});

function getImage(pokemon){
    var link = url.parse(pokemon.url, true);
    var pokemonOptions = {
        'method': 'GET',
        'hostname': link.hostname,
        'path': link.pathname,
        'headers': {
        },
        'maxRedirects': 20
    };

    var req = https.request(pokemonOptions, function (res) {
        var resultados = [];
        res.on("data", function (resultado) {
            resultados.push(resultado);
        });

        res.on("end", function(resultado){
            var body = Buffer.concat(resultados);
            pokemon['figura'] = JSON.parse(body.toString()).sprites.front_default;
        });
        
        res.on("error", function (error) {
            console.error(error);
        });
    });

    req.end();
}

server.listen(3000, function () {
    console.log("Servidor executando")
})

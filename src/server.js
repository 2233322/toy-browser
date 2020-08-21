const http = require('http')

const server = http.createServer((req, res) => {
    console.log('request received')

    req.on('data', function (body) {
        console.log(body.toString()) 
    });
      res.writeHead(200, {
        'X-Foo2': 'bar2',
        'Content-Type': 'text/plain'
      })

      // 流传输
      res.write(`<html maaa=a >
      <head>
        <style>
          .a {
            display: flex;
            flex-wrap: wrap;
            width: 320px;
            height: 400px;
            background-color: red
          }
          div .b {
            width:100px;
            height: 200px;
            background-color: #ff5000;
          }
          div .c {
            width:300px;
            height: 100px;
            background-color: #222333;
          }
          body div img {
            width:30px`)

      res.write(`;
            background-color: #ff1111;
          }
        </style>
        </head>
        <body>
          <div class="a">
            <div class="b"></div>
            <div class="b"></div>
            <div class="c"></div>
          </`)

    res.write(`div>
        </body>
      </html>`)

    res.end()


})

server.listen(8088, () => {
    console.log('server run is http://127.0.0.1:8088')
})

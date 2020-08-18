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
          body div #myid {
            width:100px;
            background-color: #ff5000;
          }
          body div img {
            width:30px`)

      res.write(`;
            background-color: #ff1111;
          }
        </style>
        </head>
        <body>
          <div main='body' style="width:200px">
              <span>hello</span>
              <img id="myid" />
              <img src='logo'/>
          </`)

    res.write(`div>
        </body>
      </html>`)

    res.end()


})

server.listen(8088, () => {
    console.log('server run is http://127.0.0.1:8088')
})

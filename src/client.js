const net = require('net')
const parser = require('./parser')

class Request {
  // method, url = host + port + path
  // body: k/v
  // headers
  constructor(options){
    this.method = options.method || 'GET'
    this.host = options.host
    this.path = options.path || '/'
    this.port = options.port || 80
    this.body = options.body || {}
    this.headers = options.headers || {}

    if (!this.headers['Content-Type']) {
      this.headers['Content-Type'] = 'application/x-www-form-urlencode'
    }

    if (this.headers['Content-Type'] === 'application/json') {
      this.bodyText = JSON.stringify(this.body)
    }

    if (this.headers['Content-Type'] === 'application/x-www-form-urlencode') {
      this.bodyText = Object.keys(this.body).map(key => `${key}=${encodeURIComponent(this.body[key])}`).join('&')
    }
    


    this.headers['Content-Length'] = this.bodyText.length
  }


  toString() {
    return `${this.method} ${this.path} HTTP/1.1\r\nHost: ${this.host}\r\n${Object.keys(this.headers).map(key => `${key}: ${this.headers[key]}`).join('\r\n')}\r\n\r\n${this.bodyText}\r\n`
  }

  send(connection) {
    return new Promise((resolve, reject) => {
      const parser = new ResponseParser
      if (connection) {
        connection.write(this.toString())
      } else {
        connection = net.createConnection({host: this.host, port: this.port }, () => {
          connection.write(this.toString())
        });
      }

      connection.on('data', data => {
        parser.receive(data.toString())
        if (parser.isFinished) {
          resolve(parser.response)
        }
        connection.end()
      });
      connection.on('end', err => {
        reject(err)
        console.log('已从服务器断开')
        connection.end()
      });


    })
    
      
    


  }
}

class Response {

}

class ResponseParser {
  constructor(){
    this.WAITING_STATUS_LINE = 0
    this.WAITING_STATUS_LINE_END = 1
    this.WAITING_HEADER_NAME = 2
    this.WAITING_HEADER_SPACE = 3
    this.WAITING_HEADER_VALUE = 4
    this.WAITING_HEADER_LINE_END = 5
    this.WAITING_HEADER_BLOCK_END = 6
    this.WAITING_BODY = 7

    this.current = this.WAITING_STATUS_LINE
    this.statusLine = ''
    this.headers = {}
    this.headerName = ''
    this.headerVaue = ''
    this.bodyParser = null
  }

  get isFinished() {
    return this.bodyParser && this.bodyParser.isFinished
  }

  get response() {
    this.statusLine.match(/^HTTP\/1.1 ([0-9]+) ([\s\S]+)$/)
    return {
      statusCode: RegExp.$1,
      statusText: RegExp.$2,
      headers: this.headers,
      body: this.bodyParser.content.join('')
    }
  }


  // 字符流处理
  receive(string){
    for (let char of string) {
      this.receiveChar(char)
    }
   // console.log('this.statusLine', JSON.stringify(this.statusLine), JSON.stringify(this.headers), this.bodyParser.content)
  }

  receiveChar(char) {
    // 处理status line  
    if (this.current === this.WAITING_STATUS_LINE) {
      if (char === '\r') {
        this.current = this.WAITING_STATUS_LINE_END
      } else {
        this.statusLine += char
      }
    } else if (this.current === this.WAITING_STATUS_LINE_END) {
      if (char === '\n') {
        this.current = this.WAITING_HEADER_NAME
      }
    } else if (this.current === this.WAITING_HEADER_NAME) {
      if (char === '\r') {
        this.current = this.WAITING_HEADER_BLOCK_END
        if (this.headers['Transfer-Encoding'] === 'chunked') {
          this.bodyParser = new TrunkedBodyParser() 
        }
      } else if (char === ':') {
        this.current = this.WAITING_HEADER_SPACE
      } else {
        this.headerName += char
      }
    } else if (this.current === this.WAITING_HEADER_SPACE) {
      if (char === ' ') {
        this.current = this.WAITING_HEADER_VALUE
      }
    } else if (this.current === this.WAITING_HEADER_VALUE) {
      if (char === '\r') {
        this.headers[this.headerName] = this.headerVaue
        this.headerName = ''
        this.headerVaue = ''
        this.current = this.WAITING_HEADER_LINE_END
      } else {
        this.headerVaue += char
      }
    } else if (this.current === this.WAITING_HEADER_LINE_END) {
      if (char === '\n') {
        this.current = this.WAITING_HEADER_NAME
      }
    } else if (this.current === this.WAITING_HEADER_BLOCK_END) {
      if (char === '\n') {
        this.current = this.WAITING_BODY
      }
    } else if (this.current === this.WAITING_BODY) {
      this.bodyParser.receiveChar(char)
    }
  }
}

class TrunkedBodyParser {
  constructor() {
    this.WAITING_LENGTH = 0
    this.WAITING_LENGTH_LINE_END = 1
    this.READING_TRUNK = 2
    this.WAITING_NEW_LENGTH = 3
    this.WAITING_NEW_LENGTH_END =4
    this.FINISHED_LINE = 5
    this.FINISHED_LINE_END = 6

    this.isFinished = false
    this.length = 0
    this.content = []
    this.current = this.WAITING_LENGTH
  }

  // Transfer-Encodeing: 'chunked'
  // 5\r\n
  // hello\r\n
  // 5\r\n
  // world\r\n
  // \r\n
  // \r\n
  receiveChar(char) {
    if (this.current === this.WAITING_LENGTH) {
      if (char === '\r') {
        if(this.length === 0) {
          this.current = this.FINISHED_LINE
        } else {
          this.current = this.WAITING_LENGTH_LINE_END
        }
        
      } else {
        this.length *= 16
        this.length += parseInt(char, 16)
      }
    } else if (this.current === this.WAITING_LENGTH_LINE_END) {
      if (char === '\n') {
        this.current = this.READING_TRUNK
      }
    } else if (this.current === this.READING_TRUNK) {
      this.content.push(char)
      this.length--
      if(this.length === 0) {
        this.current = this.WAITING_NEW_LENGTH
      }
    } else if (this.current === this.WAITING_NEW_LENGTH) {
      if (char === '\r') {
        this.current = this.WAITING_NEW_LENGTH_END
      }
    } else if (this.current === this.WAITING_NEW_LENGTH_END) {
      if (char === '\n') {
        this.current = this.WAITING_LENGTH
      }
    } else if (this.current === this.FINISHED_LINE) {
      if (char === '\r') {
        this.current = this.FINISHED_LINE_END
      }
    } else if (this.current === this.FINISHED_LINE_END) {
      if (char === '\n') {
        this.isFinished = true
      }
    }
  }
}

let request = new Request({
  method: "POST",
  path: "/",
  host: "127.0.0.1",
  port: 8088,
  headers: {
    ["X-foo"]: "bar"
  },
  body: {
    name: "xyh",
    age:89
  }
})


void async function () {
  let response = await request.send()
  let dom = parser.parserHTML(response.body)

  console.log(dom)
}()







// net.createConnection
// const client = net.createConnection({port: 8088 }, () => {
//     client.write(request.toString())
//     // console.log(JSON.stringify(request.toString()))
//     // client.write(`POST / HTTP/1.1\r\nHost: 127.0.0.1\r\nX-foo: bar\r\nContent-Type: application/json\r\nContent-Length: 15\r\n\r\nname=xyh&age=89\r\n`);
//   });
//   client.on('data', (data) => {
//     console.log(data.toString());
//     client.end();
//   });
//   client.on('end', () => {
//     console.log('已从服务器断开');
//   });



  
# toy-browser

URL -- http --> HTML -- parse --> DOM -- css computing --> DOM with CSS -- layout --> DOM with position -- render --> bitmap


## Request
GET / HTTP/1.1
Host: 127.0.0.1
Content-Type: application/x-www-form-urlencoded

hello body

## Response
HTTP/1.1 200 OK
Content-Type: text/html
Date: Sat Aug 08 2020 16:06:00 GMT
Connection: keep-alive
Transfer-Encodeing: chunked

26
<html><body>Hello world</body></html>

0
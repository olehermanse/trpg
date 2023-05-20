# Towers

https://towers.oleherman.com

## Development server

Start the development server:

```
node server.js
```

For development purposes it defaults to port 3000:

http://127.0.0.1:3000

## Containers

### docker

```
docker build --tag towers . && docker run -it -p 3000:3000 --name towers --rm towers
```

http://127.0.0.1:80

FROM node:4.6.0

EXPOSE 3000

RUN apt-get update \
  && apt-get install --no-install-recommends -y \
    build-essential \
    gcc \
    make \
  && apt-get autoremove -y \
  && apt-get clean \
  && rm -rf /var/lib/apt/lists/*
RUN npm install -g npm

RUN groupadd -r app && useradd -m -r -g app app

ADD https://github.com/Yelp/dumb-init/releases/download/v1.1.1/dumb-init_1.1.1_amd64 /usr/local/bin/dumb-init
RUN chmod +x /usr/local/bin/dumb-init
RUN mkdir -p /var/app && chown app:app /var/app

WORKDIR /var/app

RUN npm install cronfile chill-logger

# Deliberate cache-buster here to ensure the files aren't cached in builds
ADD cronfile.js .
RUN chown -R app:app /var/app

USER app
CMD [ "dumb-init", "node", "./node_modules/bin/cronfile.js", "cronfile.js" ]

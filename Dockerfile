# Set the dick image
FROM    vettl/amazon-linux

# Enable EPEL for Node.js
RUN curl -sL https://deb.nodesource.com/setup | sudo bash -
RUN apt-get -y install nodejs

RUN apt-get clean

# Install Node.js and npm
RUN     install -y npm

# Bundle app source
COPY . 

# Install app dependencies
RUN sudo npm install

# open up the port we require
EXPOSE 8088

CMD ["strava", "strava.js"]


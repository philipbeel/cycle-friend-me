### Cycle Friend Finder

App  : http://www.cyclefriend.me<br/>
Twitter : [@philipbeel](https://twitter.com/philipbeel)<br/>

App  : http://www.stravafriend.me<br/>
Twitter : @philipbeel<br/>

#### Description
*Cycle friend finder* Helps you find athletes and discover routes where you live.

#### Usage
Install all dependencies:

    $ node npm install

Create an Strava developer account `https://www.strava.com/developers`

Create a directory called `/data`. Create a file in this directory called `strava_config`

In `strava_config` add the following, including your credentials from you developer account:

    {
        "access_token"    :""
        , "client_id"     :""
        , "client_secret" :""
        , "redirect_uri"  :""
    }

Run the node script.

    $ node cycle.js

This will start a node server at `http://localhost:8088`, visit the href to view the app running.

#### Why
When I moved to to a new town I wanted to find great cycling routes. This is a tricky task on Strava when you don't know anyone living nearby. Rather than trundling through Strava segments and hoping the athletes live round the corner I wrote this tool to
do things programmatically.


#### How this works
Using Stravas V3 API, and when passed a valid athlete ID the following chain of events take place:

1. A lookup is done on the athlete id passed in to get back the `city`, `town` and `state`
2. Assuming this information is present a request for the southwest Lat/Long and northeast Lat/Long is performed against the google maps API for the athletes geo location
3. The co-ordinates are then used to lookup Strava segments within the bounds
4. For every matched segment the first page of `male` athletes ID's are retrieved and stored
5. A request is then made against each athlete to get their home location
6. For all athletes that live in the same location as the athlete ID passed in a filtered list is generated.
7. Results list is provided through the UI.

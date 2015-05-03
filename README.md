### Strava Friend Finder

#### Description
*Strava friend finder* Helps athletes find routes in their home town by finding Strava athletes who
also live in the same GEO location and have segment activities.

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

    $ node strava.js 

This will start a node server on your localhost, visit the href to view the app runnning.

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
7. This list is provided through the apps UI.

#### Improvements
- This tool returns the athletes living in the same area, what would be better is if you just got the activities back, that were not commutes. At time of writing I have not found a way of doing this with the Strava API, scraping the page with something like [x-ray](https://www.npmjs.com/package/x-ray) is troublesome as pages require authentication and are served over https by default. However 'we have the technology!' just not the correct implementation at the moment.
- There is a rate limit of 600 r/q every 15 mins. Depending on the location and number of segments this could be exceeded before you get any results. Although through limited testing I have not seen this happen.
- Some athletes keep their activities private, which can be a bind.

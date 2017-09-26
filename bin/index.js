#!/usr/bin/env node

var argv = require('minimist')(process.argv.slice(2))

if (argv.help) {
  console.log('--config /path/to/config.json')
  console.log('--auth /path/to/auth.json')
  console.log('--events /path/to/events.json')
  console.log('--ids /path/to/ids.json')
  console.log('--env environment')
  console.log('--notify calendar,googlegroups,twitter')
  process.exit()
}

if (!argv.config) {
  console.log('Specify --config /path/to/config.json')
  process.exit()
}

if (!argv.auth) {
  console.log('Specify --auth /path/to/auth.json')
  process.exit()
}

if (!argv.events) {
  console.log('Specify --events /path/to/events.json')
  process.exit()
}

if (!argv.ids) {
  console.log('Specify --ids /path/to/ids.json')
  process.exit()
}

if (typeof argv.notify !== 'string' || !argv.notify) {
  console.log('Specify --notify calendar,googlegroups,twitter')
}

var env = process.env.NODE_ENV || argv.env || 'development'


var fs = require('fs')
var path = require('path')
var Refresh = require('../lib/refresh')
var Calendar = require('../lib/calendar')
var GoogleGroups = require('../lib/googlegroups')
var Twitter = require('../lib/twitter')

var config = require(path.resolve(process.cwd(), argv.config))[env]
config.purest = require('../config/purest')

var fpath = path.resolve(process.cwd(), argv.auth)
var auth = require(fpath)
var refresh = Refresh(auth, env, fpath)

var notify = {
  calendar: Calendar(config, auth[env].google, refresh),
  googlegroups: GoogleGroups(config, auth[env].google, refresh),
  twitter: Twitter(config, auth[env].twitter),
}

var events = require(path.resolve(process.cwd(), argv.events))
var ids = require(path.resolve(process.cwd(), argv.ids))
var upcoming = events.filter((event) => ids.indexOf(event.id) === -1)


if (upcoming.length) {
  Promise.all(
    argv.notify.split(',')
      .map((provider) => notify[provider].send(upcoming))
  )
  .then(() => {
    fs.writeFileSync(
      path.resolve(process.cwd(), argv.ids),
      JSON.stringify(ids.concat(upcoming.map((event) => event.id)), null, 2),
      'utf8'
    )
  })
  .catch((err) => console.error(err))
}
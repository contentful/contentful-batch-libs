# Contentful Batch Libs

[![npm](https://img.shields.io/npm/v/contentful-batch-libs.svg)](https://www.npmjs.com/package/contentful-batch-libs)
[![Build Status](https://travis-ci.org/contentful/contentful-batch-libs.svg?branch=master)](https://travis-ci.org/contentful/contentful-batch-libs)
[![codecov](https://codecov.io/gh/contentful/contentful-batch-libs/branch/master/graph/badge.svg)](https://codecov.io/gh/contentful/contentful-batch-libs)
[![Dependency Status](https://david-dm.org/contentful/contentful-batch-libs.svg)](https://david-dm.org/contentful/contentful-batch-libs)
[![devDependency Status](https://david-dm.org/contentful/contentful-batch-libs/dev-status.svg)](https://david-dm.org/contentful/contentful-batch-libs#info=devDependencies)

[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)
[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg)](http://standardjs.com/)

This repository contains shared methods used within [Contentful's](https://www.contentful.com) [import](https://github.com/contentful/contentful-import) and [export](https://github.com/contentful/contentful-export) tools.

Even when these parts are fairly small and independent, they might not be easy to understand and use for your own projects right now.

Each module has more extensive documentation in the code regarding their own purpose.

## About

[Contentful](https://www.contentful.com) provides a content infrastructure for digital teams to power content in websites, apps, and devices. Unlike a CMS, Contentful was built to integrate with the modern software stack. It offers a central hub for structured content, powerful management and delivery APIs, and a customizable web app that enable developers and content creators to ship digital products faster.

## "Get" Modules

### getSourceSpace

Used to get content from a space, intended to be copied somewhere else, or manipulated.

### getOutdatedDestinationContent

Gets content from a space which will have content copied to it, based on a collection
of existing content.

## "Push" Modules

### creation

Entity creation methods.

### assets

Asset processing methods.

### deletion

Entity deletion methods.

### publishing

Entity publishing methods.

### pushToSpace

Pushes all changes, including deletions, to a given space. Handles (un)publishing
as well as delays after creation and before publishing.

Creates everything in the right order so that a content type for a given entry
is there when entry creation for that content type is attempted.

Allows only content model or only content pushing.

## "Transform" Modules

### transformSpace

Transforms all the content from a space, in order to ready it to be sent to another space.

### transformers

Transformer methods for each kind of entity.

## Utils

### createClients

Creates delivery and management client instances for both source and destination spaces.

### errorBuffer

Gathers errors in an internal buffer which can then be drained in order to output them to a user.

# Changelog

Check out the [releases](https://github.com/contentful/contentful-space-sync/releases) page.

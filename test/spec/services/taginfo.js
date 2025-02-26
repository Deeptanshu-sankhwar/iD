import { setTimeout } from 'node:timers/promises';

describe('iD.serviceTaginfo', function() {
    var taginfo;


    before(function() {
        iD.services.taginfo = iD.serviceTaginfo;
    });

    after(function() {
        delete iD.services.taginfo;
    });

    beforeEach(function() {
        taginfo = iD.services.taginfo;

        fetchMock.mock(new RegExp('\/keys\/all.*sortname=values_all'), {
            body: '{"data":[{"count_all":56136034,"key":"name","count_all_fraction":0.0132}]}',
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

        // prepopulate popular keys list with "name"
        taginfo.init();
        fetchMock.reset();
    });

    afterEach(function() {
        fetchMock.reset();
    });

    function parseQueryString(url) {
        return iD.utilStringQs(url.substring(url.indexOf('?')));
    }

    describe('#keys', function() {
        it('calls the given callback with the results of the keys query', async () => {
            fetchMock.mock(/\/keys\/all/, {
                body: '{"data":[{"count_all":5190337,"key":"amenity","count_all_fraction":1.0}]}',
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });

            var callback = sinon.spy();
            taginfo.keys({ query: 'amen' }, callback);

            await setTimeout(50);
            expect(parseQueryString(fetchMock.calls()[0][0])).to.eql(
                {query: 'amen', page: '1', rp: '10', sortname: 'count_all', sortorder: 'desc', lang: 'en'}
            );
            expect(callback).to.have.been.calledWith(
                null, [{'title':'amenity', 'value':'amenity'}]
            );
        });

        it('includes popular keys', async () => {
            fetchMock.mock(/\/keys\/all/, {
                body: '{"data":[{"count_all":5190337,"count_nodes":500000,"key":"amenity","count_all_fraction":1.0, "count_nodes_fraction":1.0},'
                    + '{"count_all":1,"key":"amenityother","count_all_fraction":0.0, "count_nodes":100}]}',
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });

            var callback = sinon.spy();
            taginfo.keys({ query: 'amen' }, callback);

            await setTimeout(50);
            expect(callback).to.have.been.calledWith(
                null, [{'title':'amenity', 'value':'amenity'}]
            );
        });

        it('includes popular keys with an entity type filter', async () => {
            fetchMock.mock(/\/keys\/all/, {
                body: '{"data":[{"count_all":5190337,"count_nodes":500000,"key":"amenity","count_all_fraction":1.0, "count_nodes_fraction":1.0},'
                    + '{"count_all":1,"key":"amenityother","count_all_fraction":0.0, "count_nodes":100}]}',
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });

            var callback = sinon.spy();
            taginfo.keys({ query: 'amen', filter: 'nodes' }, callback);

            await setTimeout(50);
            expect(callback).to.have.been.calledWith(
                null, [{'title':'amenity', 'value':'amenity'}]
            );
        });

        it('includes unpopular keys with a wiki page', async () => {
            fetchMock.mock(/\/keys\/all/, {
                body: '{"data":[{"count_all":5190337,"key":"amenity","count_all_fraction":1.0, "count_nodes_fraction":1.0},'
                    + '{"count_all":1,"key":"amenityother","count_all_fraction":0.0, "count_nodes_fraction":0.0, "in_wiki": true}]}',
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });

            var callback = sinon.spy();
            taginfo.keys({ query: 'amen' }, callback);

            await setTimeout(50);
            expect(callback).to.have.been.calledWith(null, [
                {'title':'amenity', 'value':'amenity'},
                {'title':'amenityother', 'value':'amenityother'}
            ]);
        });

        it('sorts keys with \':\' below keys without \':\'', async () => {
            fetchMock.mock(/\/keys\/all/, {
                body: '{"data":[{"key":"ref:bag","count_all":9790586,"count_all_fraction":0.0028},' +
                    '{"key":"ref","count_all":7933528,"count_all_fraction":0.0023}]}',
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });

            var callback = sinon.spy();
            taginfo.keys({ query: 'ref' }, callback);

            await setTimeout(50);
            expect(callback).to.have.been.calledWith(
                null, [{'title':'ref', 'value':'ref'},{'title':'ref:bag', 'value':'ref:bag'}]
            );
        });
    });

    describe('#multikeys', function() {
        it('calls the given callback with the results of the multikeys query', async () => {
            fetchMock.mock(/\/keys\/all/, {
                body: '{"data":[{"count_all":69593,"key":"recycling:glass","count_all_fraction":0.0}]}',
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });

            var callback = sinon.spy();
            taginfo.multikeys({ query: 'recycling:' }, callback);

            await setTimeout(50);
            expect(parseQueryString(fetchMock.calls()[0][0])).to.eql(
                {query: 'recycling:', page: '1', rp: '25', sortname: 'count_all', sortorder: 'desc', lang: 'en'}
            );
            expect(callback).to.have.been.calledWith(
                null, [{'title':'recycling:glass', 'value':'recycling:glass'}]
            );
        });

        it('excludes multikeys with extra colons', async () => {
            fetchMock.mock(/\/keys\/all/, {
                body: '{"data":[{"count_all":4426,"key":"service:bicycle:retail","count_all_fraction":0.0},' +
                    '{"count_all":22,"key":"service:bicycle:retail:ebikes","count_all_fraction":0.0}]}',
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });

            var callback = sinon.spy();
            taginfo.multikeys({ query: 'service:bicycle:' }, callback);

            await setTimeout(50);
            expect(callback).to.have.been.calledWith(
                null, [{'title':'service:bicycle:retail', 'value':'service:bicycle:retail'}]
            );
        });

        it('excludes multikeys with wrong prefix', async () => {
            fetchMock.mock(/\/keys\/all/, {
                body: '{"data":[{"count_all":4426,"key":"service:bicycle:retail","count_all_fraction":0.0},' +
                    '{"count_all":22,"key":"disused:service:bicycle","count_all_fraction":0.0}]}',
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });

            var callback = sinon.spy();
            taginfo.multikeys({ query: 'service:bicycle:' }, callback);

            await setTimeout(50);
            expect(callback).to.have.been.calledWith(
                null, [{'title':'service:bicycle:retail', 'value':'service:bicycle:retail'}]
            );
        });
    });

    describe('#values', function() {
        it('calls the given callback with the results of the values query', async () => {
            fetchMock.mock(/\/key\/values/, {
                body: '{"data":[{"value":"parking","description":"A place for parking cars", "count":1000}]}',
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });

            var callback = sinon.spy();
            taginfo.values({ key: 'amenity', query: 'par' }, callback);

            await setTimeout(50);
            expect(parseQueryString(fetchMock.calls()[0][0])).to.eql(
                {key: 'amenity', query: 'par', page: '1', rp: '25', sortname: 'count_all', sortorder: 'desc', lang: 'en'}
            );
            expect(callback).to.have.been.calledWith(
                null, [{'value':'parking','title':'A place for parking cars'}]
            );
        });

        it('includes popular values', async () => {
            fetchMock.mock(/\/key\/values/, {
                body: '{"data":[{"value":"parking","description":"A place for parking cars", "count":1000},' +
                    '{"value":"party","description":"A place for partying", "count":1}]}',
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });

            var callback = sinon.spy();
            taginfo.values({ key: 'amenity', query: 'par' }, callback);

            await setTimeout(50);
            expect(callback).to.have.been.calledWith(
                null, [{'value':'parking','title':'A place for parking cars'}]
            );
        });

        it('does not get values for extremely unpopular keys', async () => {
            fetchMock.mock(/\/key\/values/, {
                body: '{"data":[{"value":"Rue Pasteur","description":"", "count":3},' +
                    '{"value":"Via Trieste","description":"", "count":1}]}',
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });

            var callback = sinon.spy();
            taginfo.values({ key: 'name', query: 'ste' }, callback);

            await setTimeout(50);
            expect(callback).to.have.been.calledWith(null, []);
        });

        it('includes unpopular values with a wiki page', async () => {
            fetchMock.mock(/\/key\/values/, {
                body: '{"data":[{"value":"party","description":"A place for partying", "count":1, "in_wiki": true}]}',
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });

            var callback = sinon.spy();
            taginfo.values({ key: 'amenity', query: 'par' }, callback);

            await setTimeout(50);
            expect(callback).to.have.been.calledWith(
                null, [{'value':'party','title':'A place for partying'}]
            );
        });

        it('excludes values with capital letters and some punctuation', async () => {
            fetchMock.mock(/\/key\/values/, {
                body: '{"data":[{"value":"parking","description":"A place for parking cars", "count":2000},'
                    + '{"value":"PArking","description":"A common misspelling", "count":200},'
                    + '{"value":"parking;partying","description":"A place for parking cars *and* partying", "count":200},'
                    + '{"value":"parking, partying","description":"A place for parking cars *and* partying", "count":200},'
                    + '{"value":"*","description":"", "count":200}]}',
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });

            var callback = sinon.spy();
            taginfo.values({ key: 'amenity', query: 'par' }, callback);

            await setTimeout(50);
            expect(callback).to.have.been.calledWith(
                null, [{'value':'parking','title':'A place for parking cars'}]
            );
        });

        it('includes network values with capital letters and some punctuation', async () => {
            fetchMock.mock(/\/key\/values/, {
                body: '{"data":[{"value":"US:TX:FM","description":"Farm to Market Roads in the U.S. state of Texas.", "count":34000},'
                    + '{"value":"US:KY","description":"Primary and secondary state highways in the U.S. state of Kentucky.", "count":31000},'
                    + '{"value":"US:US","description":"U.S. routes in the United States.", "count":19000},'
                    + '{"value":"US:I","description":"Interstate highways in the United States.", "count":11000},'
                    + '{"value":"US:MD","description":"State highways in the U.S. state of Maryland.", "count":600}]}',
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });

            var callback = sinon.spy();
            taginfo.values({ key: 'network', query: 'us' }, callback);

            await setTimeout(50);
            expect(callback).to.have.been.calledWith(null, [
                {'value':'US:TX:FM','title':'Farm to Market Roads in the U.S. state of Texas.'},
                {'value':'US:KY','title':'Primary and secondary state highways in the U.S. state of Kentucky.'},
                {'value':'US:US','title':'U.S. routes in the United States.'},
                {'value':'US:I','title':'Interstate highways in the United States.'},
                {'value':'US:MD','title':'State highways in the U.S. state of Maryland.'}
            ]);
        });

        it('includes biological genus values with capital letters', async () => {
            fetchMock.mock(/\/key\/values/, {
                body: '{"data":[{"value":"Quercus","description":"Oak", "count": 1000}]}',
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });

            var callback = sinon.spy();
            taginfo.values({ key: 'genus', query: 'qu' }, callback);

            await setTimeout(50);
            expect(callback).to.have.been.calledWith(
                null, [{'value':'Quercus','title':'Oak'}]
            );
        });

        it('includes biological taxon values with capital letters', async () => {
            fetchMock.mock(/\/key\/values/, {
                body: '{"data":[{"value":"Quercus robur","description":"Oak", "count": 1000}]}',
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });

            var callback = sinon.spy();
            taginfo.values({ key: 'taxon', query: 'qu' }, callback);

            await setTimeout(50);
            expect(callback).to.have.been.calledWith(
                null, [{'value':'Quercus robur','title':'Oak'}]
            );
        });

        it('includes biological species values with capital letters', async () => {
            fetchMock.mock(/\/key\/values/, {
                body: '{"data":[{"value":"Quercus robur","description":"Oak", "count": 1000}]}',
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });

            var callback = sinon.spy();
            taginfo.values({ key: 'species', query: 'qu' }, callback);

            await setTimeout(50);
            expect(callback).to.have.been.calledWith(
                null, [{'value':'Quercus robur','title':'Oak'}]
            );
        });
    });

    describe('#roles', function() {
        it('calls the given callback with the results of the roles query', async () => {
            fetchMock.mock(/\/relation\/roles/, {
                body: '{"data":[{"role":"stop","count_relation_members_fraction":0.1757},' +
                    '{"role":"south","count_relation_members_fraction":0.0035}]}',
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });

            var callback = sinon.spy();
            taginfo.roles({ rtype: 'route', query: 's', geometry: 'relation' }, callback);

            await setTimeout(50);
            expect(parseQueryString(fetchMock.calls()[0][0])).to.eql(
                {rtype: 'route', query: 's', page: '1', rp: '25', sortname: 'count_relation_members', sortorder: 'desc', lang: 'en'}
            );
            expect(callback).to.have.been.calledWith(null, [
                {'value': 'stop', 'title': 'stop'},
                {'value': 'south', 'title': 'south'}
            ]);
        });
    });

    describe('#docs', function() {
        it('calls the given callback with the results of the docs query', async () => {
            fetchMock.mock(/\/tag\/wiki_page/, {
                body: '{"data":[{"on_way":false,"lang":"en","on_area":true,"image":"File:Car park2.jpg"}]}',
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });

            var callback = sinon.spy();
            taginfo.docs({ key: 'amenity', value: 'parking' }, callback);

            await setTimeout(50);
            expect(parseQueryString(fetchMock.calls()[0][0])).to.eql(
                {key: 'amenity', value: 'parking'}
            );
            expect(callback).to.have.been.calledWith(
                null, [{'on_way':false,'lang':'en','on_area':true,'image':'File:Car park2.jpg'}]
            );
        });
    });

});

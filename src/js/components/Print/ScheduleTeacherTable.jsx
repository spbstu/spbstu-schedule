var React = require('react');
var ReactDOM = require('react-dom')
var _ = require('lodash');
var reactRedux = require('react-redux');
var actions = require('../../actions/FacultyActions');
var LessonsTablePdf = require('../Print/LessonsTablePdf.jsx');
var du = require('../../utils/date')

var ScheduleTeacherTable = React.createClass({
    componentWillMount: function () {
        if (this.props.data) return;
        
        this.props.dispatch(actions.fetchTeacherWeeks(this.props.teacherId, [du.qString(this.props.currentWeek), du.qString(this.props.nextWeek)]));
    },

    resortLessons: function(lessons) {
        return _.chain(lessons)
            .flatMap(day =>
                _.map(day.lessons, lesson => {lesson.weekday = day.weekday; return lesson} )
            )
            .orderBy(lesson => lesson.weekday)
            .groupBy(lesson => lesson.time_start)
            .sortBy(lesson => lesson[0].time_start)
            .value()
    },

    extract: function(date) {
        var teacher = _.get(this.props.data, ['teachers', this.props.teacherId, 'teacher']);
        var dateString = du.dString(date)

        var week = _.get(this.props, ['data', 'teachers', this.props.teacherId, 'weeks', dateString, 'week']);
        var lessons = this.lessonsByDate(this.props.teacherId, dateString)
        
        if(teacher && lessons && week) {
            return {
                teacher,
                weeks: {
                    [week.is_odd ? 'odd' : 'even']: lessons
                }
            }
        } else {
            return null
        }
    },

    lessonsByDate: function(teacherId, date) {
        var lessons = _.get(this.props, ['data', 'teachers', teacherId, 'weeks', date, 'days'])
        lessons = this.resortLessons(lessons)
        return lessons
    },

    render: function() {
        var data1 = this.extract(this.props.currentWeek)
        var data2 = this.extract(this.props.nextWeek)
        
        var data = _.merge(data1, data2)

        if (!data.weeks) {
            return (
                <div className="schedule-page">
                    <div>Данные загружаются...</div>
                </div>
            )
        }

        return (
            <div className="schedule-page">
                <h3 className="page__h3">{data.teacher.full_name}, расписание с {du.humanDate(this.props.currentWeek)} по {du.humanDate(this.props.nextWeek.clone().add(6, 'days'))}</h3>
                <LessonsTablePdf ref='table' lessons={data.weeks} showGroups />
            </div>
        )
    },

    componentDidUpdate: function() {
        var node = ReactDOM.findDOMNode(this.refs.table)
        if(!node) return;

        var limit = 1000
        if(node.offsetHeight > limit * 1.25) {
            node.className += ' scale_to_fit_big'
        } else if(node.offsetHeight > limit) {
            node.className += ' scale_to_fit_small'
        }

        if(!this.props.isFetching) {
            //mark page as ready for rendering, readed by phantomjs pdf.js script
            window.readyForPdfRendering = true
        }
    },

    propTypes: {
        dispatch: React.PropTypes.func.isRequired,
        isFetching: React.PropTypes.bool.isRequired,
        data: React.PropTypes.object,

        teacherId: React.PropTypes.number.isRequired,
        currentWeek: React.PropTypes.object.isRequired,
        nextWeek: React.PropTypes.object.isRequired
    }
});

function mapStateToProps(state) {
    return {
        isFetching: state.weeks.isFetching,
        data: state.weeks.data
    }
}

ScheduleTeacherTable = reactRedux.connect(mapStateToProps)(ScheduleTeacherTable)

var RouterWrapper = React.createClass({
    render: function() {
        var location = this.props.location;
        var currentWeekString = location.query && location.query.date;
        var currentWeek = du.getWeek(currentWeekString)
        var nextWeek = currentWeek.clone().add(1, 'weeks')
        var teacherId = parseInt(this.props.params.teacherId, 10);

        return <ScheduleTeacherTable teacherId={teacherId} currentWeek={currentWeek} nextWeek={nextWeek} />
    }
})

module.exports = {component: ScheduleTeacherTable, routerWrapper: RouterWrapper};
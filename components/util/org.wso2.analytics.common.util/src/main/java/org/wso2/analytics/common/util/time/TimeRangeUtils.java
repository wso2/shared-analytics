/*
* Copyright (c) 2016, WSO2 Inc. (http://www.wso2.org) All Rights Reserved.
*
* WSO2 Inc. licenses this file to you under the Apache License,
* Version 2.0 (the "License"); you may not use this file except
* in compliance with the License.
* You may obtain a copy of the License at
*
* http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing,
* software distributed under the License is distributed on an
* "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
* KIND, either express or implied.  See the License for the
* specific language governing permissions and limitations
* under the License.
*/

package org.wso2.analytics.common.util.time;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.joda.time.DateTime;
import org.joda.time.DateTimeConstants;
import org.joda.time.DateTimeFieldType;
import org.joda.time.Days;
import org.joda.time.Hours;
import org.joda.time.Minutes;
import org.joda.time.Months;
import org.joda.time.MutableDateTime;
import org.wso2.analytics.common.util.time.bean.TimeRange;

import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;

public class TimeRangeUtils {

    private static final int INTERVAL = 6;
    private static final Log log = LogFactory.getLog(TimeRangeUtils.class);
    private static final SimpleDateFormat formatter = new SimpleDateFormat("yyyy-MM-dd HH.mm.ss");

    private TimeRangeUtils() {
    }

    public static String getSuitableTimeRangeUnit(long from, long to) {
        DateTime fromTime = new DateTime(from);
        DateTime toTime = new DateTime(to);
        RangeUnit range;
        if (Months.monthsBetween(fromTime, toTime).getMonths() >= INTERVAL) {
            range = RangeUnit.MONTH;
        } else if (Days.daysBetween(fromTime, toTime).getDays() >= INTERVAL) {
            range = RangeUnit.DAY;
        } else if (Hours.hoursBetween(fromTime, toTime).getHours() >= INTERVAL) {
            range = RangeUnit.HOUR;
        } else if (Minutes.minutesBetween(fromTime, toTime).getMinutes() >= INTERVAL) {
            range = RangeUnit.MINUTE;
        } else {
            range = RangeUnit.SECOND;
        }
        return range.name();
    }

    public static int getNoOfSecondForMonthInGivenTimestamp(long timestamp) {
        DateTime time = new DateTime(timestamp);
        return time.dayOfMonth().getMaximumValue() * DateTimeConstants.SECONDS_PER_DAY;
    }

    public static List<TimeRange> getDateTimeRanges(long from, long to) {
        List<TimeRange> ranges = new ArrayList<>(10);
        MutableDateTime fromDate = new MutableDateTime(from);
        fromDate.set(DateTimeFieldType.millisOfSecond(), 0);
        MutableDateTime toDate = new MutableDateTime(to);
        toDate.set(DateTimeFieldType.millisOfSecond(), 0);
        MutableDateTime tempFromTime = fromDate.copy();
        MutableDateTime tempToTime = toDate.copy();

        if (log.isDebugEnabled()) {
            log.debug("Time range: " + formatter.format(fromDate.toDate()) + "->" + formatter.format(toDate.toDate()));
        }

        if (toDate.getMillis() - fromDate.getMillis() < DateTimeConstants.MILLIS_PER_MINUTE) {
            ranges.add(new TimeRange(RangeUnit.SECOND.name(), new long[]{fromDate.getMillis(), toDate.getMillis()}));
        } else {
            if (tempFromTime.getSecondOfMinute() != 0 && (toDate.getMillis() - fromDate.getMillis() > DateTimeConstants.MILLIS_PER_MINUTE)) {
                tempFromTime = tempFromTime.minuteOfHour().roundCeiling();
                ranges.add(new TimeRange(RangeUnit.SECOND.name(), new long[]{fromDate.getMillis(), tempFromTime.getMillis()}));
            }
            if (tempFromTime.getMinuteOfHour() != 0 &&
                ((toDate.getMillis() - tempFromTime.getMillis()) >= DateTimeConstants.MILLIS_PER_MINUTE)) {
                fromDate = tempFromTime.copy();
                if (((toDate.getMillis() - tempFromTime.getMillis()) / DateTimeConstants.MILLIS_PER_MINUTE) < 60) {
                    tempFromTime = tempFromTime.minuteOfHour().add((toDate.getMillis() - tempFromTime.getMillis()) / DateTimeConstants.MILLIS_PER_MINUTE);
                } else {
                    tempFromTime = tempFromTime.hourOfDay().roundCeiling();
                }
                ranges.add(new TimeRange(RangeUnit.MINUTE.name(), new long[]{fromDate.getMillis(), tempFromTime.getMillis()}));
            }
            if (tempFromTime.getHourOfDay() != 0 &&
                ((toDate.getMillis() - tempFromTime.getMillis()) >= DateTimeConstants.MILLIS_PER_HOUR)) {
                fromDate = tempFromTime.copy();
                if (((toDate.getMillis() - tempFromTime.getMillis()) / DateTimeConstants.MILLIS_PER_HOUR) < 24) {
                    tempFromTime = tempFromTime.hourOfDay().add((toDate.getMillis() - tempFromTime.getMillis()) /
                                                                DateTimeConstants.MILLIS_PER_HOUR);
                } else {
                    tempFromTime = tempFromTime.dayOfMonth().roundCeiling();
                }
                ranges.add(new TimeRange(RangeUnit.HOUR.name(), new long[]{fromDate.getMillis(), tempFromTime.getMillis()}));
            }
            if (tempFromTime.getDayOfMonth() != 1 &&
                ((toDate.getMillis() - tempFromTime.getMillis()) >= DateTimeConstants.MILLIS_PER_DAY)) {
                fromDate = tempFromTime.copy();
                if ((((toDate.getMillis() - tempFromTime.getMillis()) / DateTimeConstants.MILLIS_PER_DAY)) < tempFromTime
                        .dayOfMonth().getMaximumValue()) {
                    tempFromTime = tempFromTime.dayOfMonth().add(((toDate.getMillis() - tempFromTime.getMillis()) /
                                                                  ((long) DateTimeConstants.MILLIS_PER_DAY)));
                } else {
                    tempFromTime = tempFromTime.monthOfYear().roundCeiling();
                }
                ranges.add(new TimeRange(RangeUnit.DAY.name(), new long[]{fromDate.getMillis(), tempFromTime.getMillis()}));
            }
            if (tempToTime.getSecondOfMinute() != 0 &&
                (tempToTime.getMillis() - tempFromTime.getMillis()) >= DateTimeConstants.MILLIS_PER_SECOND) {
                toDate = tempToTime.copy();
                long remainingSeconds = ((toDate.getMillis() - tempFromTime.getMillis()) % DateTimeConstants
                        .MILLIS_PER_MINUTE) / DateTimeConstants.MILLIS_PER_SECOND;
                if (remainingSeconds < 60) {
                    tempToTime = tempToTime.secondOfMinute().add(-1 * remainingSeconds);

                } else {
                    tempToTime = tempToTime.secondOfMinute().roundFloor();
                }
                ranges.add(new TimeRange(RangeUnit.SECOND.name(), new long[]{tempToTime.getMillis(), toDate.getMillis()}));
            }
            if (tempToTime.getMinuteOfHour() != 0 &&
                ((tempToTime.getMillis() - tempFromTime.getMillis()) >= DateTimeConstants.MILLIS_PER_MINUTE)) {
                toDate = tempToTime.copy();
                long remainingMinutes = ((toDate.getMillis() - tempFromTime.getMillis()) % DateTimeConstants
                        .MILLIS_PER_HOUR) / DateTimeConstants.MILLIS_PER_MINUTE;
                if (remainingMinutes < 60) {
                    tempToTime = tempToTime.minuteOfHour().add(-1 * remainingMinutes);
                } else {
                    tempToTime = tempToTime.hourOfDay().roundFloor();
                }
                ranges.add(new TimeRange(RangeUnit.MINUTE.name(), new long[]{tempToTime.getMillis(), toDate.getMillis()}));
            }
            if (tempToTime.getHourOfDay() != 0 &&
                ((tempToTime.getMillis() - tempFromTime.getMillis()) >= DateTimeConstants.MILLIS_PER_HOUR)) {
                toDate = tempToTime.copy();
                long remainingHours = ((toDate.getMillis() - tempFromTime.getMillis()) % DateTimeConstants
                        .MILLIS_PER_DAY) / DateTimeConstants.MILLIS_PER_HOUR;
                if (remainingHours < 24) {
                    tempToTime = tempToTime.hourOfDay().add(-1 * remainingHours);
                } else {
                    tempToTime = tempToTime.dayOfMonth().roundFloor();
                }
                ranges.add(new TimeRange(RangeUnit.HOUR.name(), new long[]{tempToTime.getMillis(), toDate.getMillis()}));
            }
            if (tempToTime.getDayOfMonth() != 1 &&
                ((tempToTime.getMillis() - tempFromTime.getMillis()) >= DateTimeConstants.MILLIS_PER_DAY)) {
                toDate = tempToTime.copy();
                tempToTime = tempToTime.monthOfYear().roundFloor();
                ranges.add(new TimeRange(RangeUnit.DAY.name(), new long[]{tempToTime.getMillis(), toDate.getMillis()}));
            }
            if (tempToTime.isAfter(tempFromTime)) {
                ranges.add(new TimeRange(RangeUnit.MONTH.name(), new long[]{tempFromTime.getMillis(), tempToTime.getMillis()}));
            }
        }
        if (log.isDebugEnabled()) {
            for (TimeRange timeRange : ranges) {
                log.debug("Unit: " + timeRange.getUnit() + " Range: " + formatter.format(new Date(timeRange.getRange()[0]))
                          + "(" + timeRange.getRange()[0] + ")->" +
                          formatter.format(new Date(timeRange.getRange()[1])) + "(" + timeRange.getRange()[1] + ")");
            }
        }
        return ranges;
    }
}

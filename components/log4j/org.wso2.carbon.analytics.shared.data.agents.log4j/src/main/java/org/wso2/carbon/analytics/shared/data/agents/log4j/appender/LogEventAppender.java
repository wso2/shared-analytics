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

package org.wso2.carbon.analytics.shared.data.agents.log4j.appender;

import org.apache.log4j.Appender;
import org.apache.log4j.AppenderSkeleton;
import org.apache.log4j.Logger;
import org.apache.log4j.helpers.LogLog;
import org.apache.log4j.spi.LoggingEvent;
import org.apache.log4j.spi.ThrowableInformation;
import org.wso2.carbon.analytics.shared.data.agents.log4j.appender.ds.LogAppenderServiceValueHolder;
import org.wso2.carbon.analytics.shared.data.agents.log4j.util.AppenderConstants;
import org.wso2.carbon.analytics.shared.data.agents.log4j.util.TenantAwarePatternLayout;
import org.wso2.carbon.context.CarbonContext;
import org.wso2.carbon.context.PrivilegedCarbonContext;
import org.wso2.carbon.databridge.agent.DataPublisher;
import org.wso2.carbon.databridge.agent.exception.DataEndpointAgentConfigurationException;
import org.wso2.carbon.databridge.agent.exception.DataEndpointAuthenticationException;
import org.wso2.carbon.databridge.agent.exception.DataEndpointConfigurationException;
import org.wso2.carbon.databridge.agent.exception.DataEndpointException;
import org.wso2.carbon.databridge.commons.Event;
import org.wso2.carbon.databridge.commons.exception.TransportException;
import org.wso2.carbon.logging.service.util.LoggingConstants;
import org.wso2.carbon.analytics.shared.data.agents.log4j.util.TenantDomainAwareLoggingEvent;
import org.wso2.carbon.utils.logging.handler.TenantDomainSetter;
import org.wso2.securevault.SecretResolver;
import org.wso2.securevault.SecretResolverFactory;

import java.io.PrintWriter;
import java.io.StringWriter;
import java.text.DateFormat;
import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.Arrays;
import java.util.List;
import java.util.Properties;
import java.util.Date;
import java.util.Map;
import java.util.HashMap;
import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

/**
 * LogEventAppender is the custom log4j appender class for publishing
 * tenant aware WSO2 carbon logging events to the DAS server.
 * A log4j.property file configuration information needed
 * for the filtering and publishing operations that LogEventAppender supports.
 * This configuration information includes:
 * <ul>
 * <li> log4j.appender.DAS_AGENT=org.wso2.carbon.analytics.shared.data.agents.log4j.appender.LogEventAppender
 * <li> log4j.appender.DAS_AGENT.layout=org.wso2.carbon.analytics.shared.data.agents.log4j.util.TenantAwarePatternLayout
 * <li> log4j.appender.DAS_AGENT.columnList=%D,%S,%A,%d,%c,%p,%m,%H,%I,%Stacktrace
 * <li> log4j.appender.DAS_AGENT.userName=admin
 * <li> log4j.appender.DAS_AGENT.password=admin
 * <li> log4j.appender.DAS_AGENT.maxTolerableConsecutiveFailure=5
 * <li> log4j.appender.DAS_AGENT.url=tcp://localhost:7612
 * <li> log4j.appender.DAS_AGENT.streamDef=loganalyzer:1.0.0
 * </ul>
 * <p>
 * The log4j logging framework populate these information prior to the invocation of the activateOptions by using
 * getter and setter methods which are implemented in the LogEventAppender class.
 * <p>
 * <h3>Some important points to consider are that :</h3>
 * <ul>
 * <li>
 * The data publisher needs some system property to set for the initialization process
 * (ex : "javax.net.ssl.trustStore"). When the carbon logging invoke the appender activateOptions()
 * method these properties are not in the system property.
 * All the filtering and publishing task are not executing until those system properties are available.
 * The limitation is during this waiting process all the log events discard by the LogEventAppender class.
 * </li>
 * <li>
 * For the first event after above waiting process checking nullity of the publisher object.
 * If publisher is null log event processing (filtering and publishing tasks) will be stopped until user
 * provide correct publisher configuration and restart the server.
 * </li>
 * </ul>
 * <h3>Some important instance variables used are :</h3>
 * <ul>
 * <li>
 * <b>loggingEvents</b> : log event queue uses for buffering the log event, append method offers filtered log events
 * to the queue and LogPublisherTask runnable takes the event from the queue and perform the publishing tasks.
 * </li>
 * <li>
 * <b>scheduler</b> : uses for publish operation task scheduling. This include following params and user can configuer them
 * log4j.property file as follows:
 * <ul>
 * <li>log4j.appender.DAS_AGENT.schedulerCorePoolSize=10</li>
 * <li>log4j.appender.DAS_AGENT.schedulerInitialDelay=10</li>
 * <li>log4j.appender.DAS_AGENT.schedulerTerminationDelay=10</li>
 * </ul>
 * <ul>
 * <li>schedulerCorePoolSize : default value is 10 and defined the thread pool size for publish tasks.</li>
 * <li>schedulerInitialDelay : default value is 10 and defined the time to delay first execution.</li>
 * <li>schedulerInitialDelay : default value is 10 and defined the delay between the termination of one
 * execution and the commencement of the next.</li>
 * </ul>
 * </li>
 * </ul>
 */
public class LogEventAppender extends AppenderSkeleton implements Appender {
    private BlockingQueue<TenantDomainAwareLoggingEvent> loggingEvents;
    private ScheduledExecutorService scheduler;
    private DataPublisher dataPublisher;
    private int failedCount;
    private boolean isFirstEvent = true;
    private boolean isStackTrace = false;

    private String url;
    private String password;
    private String userName;
    private String instanceId;
    private String columnList;
    private int maxTolerableConsecutiveFailure;
    private int processingLimit = 100;
    private int schedulerCorePoolSize = 10;
    private int schedulerInitialDelay = 10;
    private int schedulerTerminationDelay = 10;
    private String streamDef;
    private String authURLs;
    private String protocol = "Thrift";
    private String serviceName;

    private TenantAwarePatternLayout tenantDomainLayout;
    private TenantAwarePatternLayout serverNameLayout;
    private TenantAwarePatternLayout appNameLayout;
    private TenantAwarePatternLayout logTimeLayout;
    private TenantAwarePatternLayout loggerLayout;
    private TenantAwarePatternLayout priorityLayout;
    private TenantAwarePatternLayout messageLayout;
    private TenantAwarePatternLayout ipLayout;
    private TenantAwarePatternLayout instanceLayout;

    /**
     * Log appender activator option by log4j framework.
     */
    @Override
    public void activateOptions() {
        loggingEvents = new ArrayBlockingQueue<>(processingLimit);
        scheduler = Executors.newScheduledThreadPool(schedulerCorePoolSize);
        scheduler.scheduleWithFixedDelay(new LogPublisherTask(), schedulerInitialDelay, schedulerTerminationDelay, TimeUnit.MILLISECONDS);
        serviceName = TenantDomainSetter.getServiceName();

        List<String> patterns = Arrays.asList(columnList.split(","));
        for (String pattern : patterns) {
            switch (pattern) {
                case "%D":
                    tenantDomainLayout = new TenantAwarePatternLayout("%D");
                    break;
                case "%S":
                    serverNameLayout = new TenantAwarePatternLayout("%S");
                    break;
                case "%A":
                    appNameLayout = new TenantAwarePatternLayout("%A");
                    break;
                case "%d":
                    logTimeLayout = new TenantAwarePatternLayout("%d");
                    break;
                case "%c":
                    loggerLayout = new TenantAwarePatternLayout("%c");
                    break;
                case "%p":
                    priorityLayout = new TenantAwarePatternLayout("%p");
                    break;
                case "%m":
                    messageLayout = new TenantAwarePatternLayout("%m");
                    break;
                case "%H":
                    ipLayout = new TenantAwarePatternLayout("%H");
                    break;
                case "%I":
                    instanceLayout = new TenantAwarePatternLayout("%I");
                    break;
                case "%Stacktrace":
                    isStackTrace = true;
                    break;
                default:
                    LogLog.error("Invalid pattern given : " + pattern + ",  not found in pattern matching.");
                    break;
            }
        }
    }

    private void publisherInitializer() {
        try {
            dataPublisher = new DataPublisher(protocol, url, authURLs, userName, resolveSecretPassword());
        } catch (DataEndpointAgentConfigurationException e) {
            LogLog.error("Invalid URLs : (" + url + (authURLs != null ? ", " + authURLs : "") + ") or username : " +
                    userName + " passed for receiver and auth, and hence expected to fail for data agent "
                    + e.getMessage(), e);
        } catch (DataEndpointException e) {
            LogLog.error("Error while trying to publish events to data receiver " + e.getMessage(), e);
        } catch (DataEndpointConfigurationException e) {
            LogLog.error("Invalid urls (" + url + (authURLs != null ? ", " + authURLs : "") + ") or username : " +
                    userName + " passed for receiver and auth, and hence expected to fail for data endpoint " +
                    e.getMessage(), e);
        } catch (DataEndpointAuthenticationException e) {
            LogLog.error("Error while trying to login to data receiver : " + e.getMessage(), e);
        } catch (TransportException e) {
            LogLog.error("Thrift transport exception occurred " + e.getMessage(), e);
        }
    }

    /**
     * Password is configured in log4j properties, either in plain text or alias. Resolves the correct real password
     * in either case.
     */
    private String resolveSecretPassword() {
        Properties passwordProperty = new Properties();
        passwordProperty.put(AppenderConstants.SECRET_ALIAS, password);
        SecretResolver secretResolver = SecretResolverFactory.create(passwordProperty);
        //Checking the log4j appender DAS credentials.
        if (secretResolver != null && secretResolver.isInitialized()) {
            if (secretResolver.isTokenProtected(AppenderConstants.SECRET_ALIAS)) {
                return secretResolver.resolve(AppenderConstants.SECRET_ALIAS);
            }
        }
        return password; //When secure vault is not in use.
    }

    /**
     * Log4j framework shutting down the log appender resources.
     */
    public void close() {
        if (scheduler != null) {
            try {
                scheduler.shutdown();
                scheduler.awaitTermination(10, TimeUnit.SECONDS);
            } catch (InterruptedException e) {
                // (Re-)Cancel if current thread also interrupted
                scheduler.shutdownNow();
                // Preserve interrupt status
                Thread.currentThread().interrupt();
                LogLog.error("Interrupted while awaiting for Schedule Executor termination" + e.getMessage(), e);
            }
        }
        try {
            if (dataPublisher != null) {
                dataPublisher.shutdown();
            }
        } catch (DataEndpointException e) {
            LogLog.error("Error in shutting down the data publisher " + e.getMessage(), e);
        }
    }

    /**
     * Append the log event by log4j framework.
     */
    @Override
    protected void append(LoggingEvent event) {
        // Checking the configuration context service for wait DAS appender until proper server initialization.
        if (LogAppenderServiceValueHolder.getConfigurationContextService() != null) {
            if (isFirstEvent) {
                publisherInitializer();
                isFirstEvent = false;
            }

            if (dataPublisher != null) {
                Logger logger = Logger.getLogger(event.getLoggerName());
                ThrowableInformation throwableInformation = event.getThrowableInformation();
                TenantDomainAwareLoggingEvent tenantEvent = new TenantDomainAwareLoggingEvent(event.fqnOfCategoryClass,
                        logger, event.timeStamp, event.getLevel(), event.getMessage(),
                        (throwableInformation != null) ? throwableInformation.getThrowable() : null);

                int tenantId = PrivilegedCarbonContext.getThreadLocalCarbonContext().getTenantId(true);
                tenantEvent.setTenantId(String.valueOf(tenantId));
                String tenantDomain = PrivilegedCarbonContext.getThreadLocalCarbonContext().getTenantDomain(true);
                tenantEvent.setTenantDomain(tenantDomain);
                String appName = CarbonContext.getThreadLocalCarbonContext().getApplicationName();
                if (appName != null) {
                    tenantEvent.setServiceName(appName);
                } else if (serviceName != null) {
                    tenantEvent.setServiceName(serviceName);
                } else {
                    tenantEvent.setServiceName("");
                }
                if (!loggingEvents.offer(tenantEvent)) {
                    if (++failedCount % 1000 == 0) {
                        LogLog.warn("Logging events queue exceed the process limits " + processingLimit + ", dropping the " +
                                "log event.");
                    }
                }
            }
        }
    }

    private String getStacktrace(Throwable e) {
        StringWriter stringWriter = new StringWriter();
        e.printStackTrace(new PrintWriter(stringWriter));
        return stringWriter.toString().trim();
    }

    public boolean requiresLayout() {
        return false;
    }

    public String getInstanceId() {
        return instanceId;
    }

    public void setInstanceId(String instanceId) {
        this.instanceId = instanceId;
    }

    public String getUrl() {
        return url;
    }

    public void setUrl(String url) {
        this.url = url;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public String getUserName() {
        return userName;
    }

    public void setUserName(String userName) {
        this.userName = userName;
    }

    public String getColumnList() {
        return columnList;
    }

    public void setColumnList(String columnList) {
        this.columnList = columnList;
    }

    public int getMaxTolerableConsecutiveFailure() {
        return maxTolerableConsecutiveFailure;
    }

    public String getStreamDef() {
        return streamDef;
    }

    public void setStreamDef(String streamDef) {
        this.streamDef = streamDef;
    }

    public void setMaxTolerableConsecutiveFailure(int maxTolerableConsecutiveFailure) {
        this.maxTolerableConsecutiveFailure = maxTolerableConsecutiveFailure;
    }

    public int getProcessingLimit() {
        return processingLimit;
    }

    public void setProcessingLimit(int processingLimit) {
        this.processingLimit = processingLimit;
    }

    public String getAuthURLs() {
        return authURLs;
    }

    public void setAuthURLs(String authURLs) {
        this.authURLs = authURLs;
    }

    public void setProtocol(String protocol) {
        this.protocol = protocol;
    }

    public int getSchedulerCorePoolSize() {
        return schedulerCorePoolSize;
    }

    public void setSchedulerCorePoolSize(int schedulerCorePoolSize) {
        this.schedulerCorePoolSize = schedulerCorePoolSize;
    }

    public int getSchedulerInitialDelay() {
        return schedulerInitialDelay;
    }

    public void setSchedulerInitialDelay(int schedulerInitialDelay) {
        this.schedulerInitialDelay = schedulerInitialDelay;
    }

    public int getSchedulerTerminationDelay() {
        return schedulerTerminationDelay;
    }

    public void setSchedulerTerminationDelay(int schedulerTerminationDelay) {
        this.schedulerTerminationDelay = schedulerTerminationDelay;
    }

    private final class LogPublisherTask implements Runnable {
        public void run() {
            try {
                while (!loggingEvents.isEmpty()) {
                    if (dataPublisher != null) {
                        try {
                            publishLogEvent(loggingEvents.take());
                        } catch (ParseException e) {
                            LogLog.error("LogEventAppender Cannot publish log event, " + e.getMessage(), e);
                        }
                    }
                }
            } catch (InterruptedException e) {
                // Preserve interrupt status
                Thread.currentThread().interrupt();
                LogLog.error("LogEventAppender Cannot publish log events, " + e.getMessage(), e);
            }
        }

        /**
         * Publishing the log event using thrift client.
         *
         * @param event log event which is wrapped TenantAwareLoggingEvent.
         * @throws ParseException signals that an error has been reached unexpectedly while parsing.
         */
        private void publishLogEvent(TenantDomainAwareLoggingEvent event) throws ParseException {
            String tenantDomain = tenantDomainLayout.format(event);
            if (tenantDomain == null || tenantDomain.isEmpty()) {
                tenantDomain = AppenderConstants.TENANT_DOMAIN_NOT_AVAILABLE_MESSAGE;
            }
            String serverName = format(event, serverNameLayout);
            String appName = format(event, appNameLayout);
            String logTime = format(event, logTimeLayout);
            String logger = format(event, loggerLayout);
            String priority = format(event, priorityLayout);
            String message = format(event, messageLayout);
            String ip = format(event, ipLayout);
            String instance = (getInstanceId() == null || getInstanceId().isEmpty()) ? format(event, instanceLayout) :
                    getInstanceId();
            String stacktrace = "";

            if (isStackTrace) {
                if (event.getThrowableInformation() != null) {
                    stacktrace = getStacktrace(event.getThrowableInformation().getThrowable());
                }
            }
            DateFormat formatter = new SimpleDateFormat(LoggingConstants.DATE_TIME_FORMATTER);
            Date date = formatter.parse(logTime);
            Map<String, String> arbitraryDataMap = new HashMap<String, String>();
            arbitraryDataMap.put(AppenderConstants.ARBITRARY_FIELD_SERVER_NAME, serverName);
            arbitraryDataMap.put(AppenderConstants.ARBITRARY_FIELD_APP_NAME, appName);
            arbitraryDataMap.put(AppenderConstants.ARBITRARY_FIELD_EVENT_TIMESTAMP, String.valueOf(date.getTime()));
            arbitraryDataMap.put(AppenderConstants.ARBITRARY_FIELD_CLASS, logger);
            arbitraryDataMap.put(AppenderConstants.ARBITRARY_FIELD_LEVEL, priority);
            arbitraryDataMap.put(AppenderConstants.ARBITRARY_FIELD_CONTENT, message);
            arbitraryDataMap.put(AppenderConstants.ARBITRARY_FIELD_IP, ip);
            arbitraryDataMap.put(AppenderConstants.ARBITRARY_FIELD_INSTANCE, instance);
            if (event.getThrowableInformation() != null) {
                arbitraryDataMap.put(AppenderConstants.ARBITRARY_FIELD_TRACE, stacktrace);
            }
            Event logEvent = new Event(streamDef, date.getTime(), null, null, new String[]{tenantDomain},
                    arbitraryDataMap);
            dataPublisher.publish(logEvent);
        }
    }

    private String format(TenantDomainAwareLoggingEvent event, TenantAwarePatternLayout tenantAwarePatternLayout) {
        if (tenantAwarePatternLayout != null) {
            return tenantAwarePatternLayout.format(event);
        }
        return "";
    }
}


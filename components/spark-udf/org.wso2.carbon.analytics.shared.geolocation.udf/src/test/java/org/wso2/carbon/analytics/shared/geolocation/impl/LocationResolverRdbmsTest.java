/*
 * Copyright (c) 2017, WSO2 Inc. (http://www.wso2.org) All Rights Reserved.
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

package org.wso2.carbon.analytics.shared.geolocation.impl;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.h2.jdbcx.JdbcDataSource;
import org.testng.Assert;
import org.testng.annotations.BeforeTest;
import org.testng.annotations.Test;
import org.wso2.carbon.analytics.shared.geolocation.api.Location;
import org.wso2.carbon.analytics.shared.geolocation.dbutil.DBUtil;
import org.wso2.carbon.analytics.shared.geolocation.exception.GeoLocationResolverException;

import java.io.File;
import java.io.IOException;
import java.lang.reflect.Field;
import java.lang.reflect.InvocationHandler;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.lang.reflect.Proxy;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import javax.sql.DataSource;

/**
 * Tests the LocationResolverRdbms with mock memory based database.
 *
 * Here a dynamic proxy mechanism is used as we do not use mockito library. Use of mockito will make the test much elegant.
 */
public class LocationResolverRdbmsTest {

    private static Log logger = LogFactory.getLog(LocationResolverRdbmsTest.class);

    private LocationResolverRdbms locationResolverRdbms;
    private int threadCount = 10;
    private static String LOCATION_MAPPING_DATA_LOCATION = "../../../../../features/spark-udf/org.wso2.carbon" +
            ".analytics.shared.geolocation.udf.feature/src/main/resources/dbscripts/h2.sql";

    @BeforeTest
    public void setUp() throws NoSuchFieldException, IllegalAccessException, IOException, GeoLocationResolverException {
        locationResolverRdbms = new LocationResolverRdbms();
        locationResolverRdbms.setDataSource("test");

        Field datasourceField = DBUtil.class.getDeclaredField("dataSource");
        datasourceField.setAccessible(true);

        JdbcDataSource dataSource = new JdbcDataSource();
        dataSource.setURL("jdbc:h2:mem:test;DB_CLOSE_DELAY=-1");
        dataSource.setUser("sa");
        dataSource.setPassword("sa");

        datasourceField.set(null, dataSource);
        locationResolverRdbms.init();

        loadLocationMapping(dataSource);
    }

    private void loadLocationMapping(JdbcDataSource ds) throws IOException {
        String scriptFileAbsolute =
                this.getClass().getClassLoader().getResource(".").getFile() + LOCATION_MAPPING_DATA_LOCATION;
        File file = new File(scriptFileAbsolute);

        final String LOAD_DATA_QUERY = "RUNSCRIPT FROM '" + file.getCanonicalPath() + "'";

        Connection connection = null;
        try {
            connection = ds.getConnection();
            Statement statement = connection.createStatement();
            statement.execute(LOAD_DATA_QUERY);
        } catch (SQLException e) {
            logger.error("Error in loading the mapping data from : " + file.getCanonicalPath());
        } finally {
            if (connection != null) {
                try {
                    connection.close();
                } catch (SQLException e) {
                    logger.error("Error in closing the connection : " + file.getCanonicalPath());
                }
            }
        }
    }

    @Test
    public void testGetLocation() throws Exception {
        Location location1 = locationResolverRdbms.getLocation("192.168.2.1");
        Assert.assertNotNull(location1);
        Assert.assertEquals(location1.getCountry(), "Germany");

        Location location2 = locationResolverRdbms.getLocation("::ffff:192.168.2.1");
        Assert.assertNotNull(location2);
        Assert.assertEquals(location2.getCountry(), "Germany");

        location2 = locationResolverRdbms.getLocation("::ffff:c0a8:201");
        Assert.assertNotNull(location2);
        Assert.assertEquals(location2.getCountry(), "Germany");

        location2 = locationResolverRdbms.getLocation("::0909:c0a8:201");
        Assert.assertNull(location2);

        location2 = locationResolverRdbms.getLocation("::ffff:c0a9:202");
        Assert.assertNull(location2);
        location2 = locationResolverRdbms.getLocation("192.168.2.0/24");
        Assert.assertNotNull(location2);
        Assert.assertEquals(location2.getCountry(), "Germany");

    }

    /**
     * Tests for Constraint violation in DB concurrent scenario.
     *
     * Test by artificially making the location INSERT query slow. then run the location fetch with multiple threads.
     *
     * @throws NoSuchFieldException
     * @throws IllegalAccessException
     * @throws GeoLocationResolverException
     * @throws InterruptedException
     * @throws TimeoutException
     * @throws ExecutionException
     */
    @Test
    public void testGetLocation_ConcurrentModification()
            throws NoSuchFieldException, IllegalAccessException, GeoLocationResolverException, InterruptedException,
            TimeoutException, ExecutionException {
        Field datasourceField = DBUtil.class.getDeclaredField("dataSource");
        datasourceField.setAccessible(true);

        JdbcDataSource dataSource = new JdbcDataSource();
        dataSource.setURL("jdbc:h2:mem:test;DB_CLOSE_DELAY=-1");
        dataSource.setUser("sa");
        dataSource.setPassword("sa");

        SimpleInvocationHandler handler = new SimpleInvocationHandler(dataSource);
        handler.addInterceptor(new MethodInterceptor<DataSource, Connection>(DataSource.class, "getConnection") {

            @Override
            Connection invoke(DataSource o, Object[] args) throws InvocationTargetException {
                Connection connection = super.invoke(o, args);
                SimpleInvocationHandler handler1 = new SimpleInvocationHandler(connection);
                handler1.addInterceptor(
                        new MethodInterceptor<Connection, PreparedStatement>(Connection.class, "prepareStatement",
                                String.class) {

                            @Override
                            PreparedStatement invoke(Connection o, Object[] args) throws InvocationTargetException {
                                final PreparedStatement preparedStatement = super.invoke(o, args);
                                SimpleInvocationHandler handler2 = new SimpleInvocationHandler(preparedStatement);
                                handler2.addInterceptor(
                                        new MethodInterceptor<PreparedStatement, Boolean>(PreparedStatement.class,
                                                "execute") {

                                            @Override
                                            Boolean invoke(PreparedStatement o, Object[] args)
                                                    throws InvocationTargetException {
                                                try {
                                                    //Delay the execution by 100ms, to simulate slow insert.
                                                    Thread.sleep(100);
                                                } catch (InterruptedException e) {
                                                    logger.error(e);
                                                }
                                                return super.invoke(o, args);
                                            }
                                        });
                                return (PreparedStatement) Proxy.newProxyInstance(this.getClass().getClassLoader(),
                                        new Class[] { PreparedStatement.class }, handler2);
                            }
                        });
                return (Connection) Proxy
                        .newProxyInstance(this.getClass().getClassLoader(), new Class[] { Connection.class }, handler1);
            }
        });
        DataSource wrapped = (DataSource) Proxy
                .newProxyInstance(this.getClass().getClassLoader(), new Class[] { DataSource.class }, handler);

        datasourceField.set(null, wrapped);
        locationResolverRdbms.setPersistInDataBase(true);
        locationResolverRdbms.init();

        ExecutorService executor = Executors.newFixedThreadPool(threadCount);
        List<GetLocationTestRunner> testRunners = new ArrayList<>();
        for (int i = 0; i < threadCount; i++) {
            testRunners.add(new GetLocationTestRunner());
        }
        List<Future<Boolean>> testResults = executor.invokeAll(testRunners);
        for (Future<Boolean> testResult : testResults) {
            try {
                Boolean result = testResult.get(500, TimeUnit.MILLISECONDS);
                Assert.assertTrue(result);
            } catch (ExecutionException e) {
                Assert.fail("Error occurred while multiple thread execution ", e);
            }
        }
        executor.awaitTermination(1000, TimeUnit.MILLISECONDS);
    }

    /**
     * An Invocation handler to generate dynamic proxy.
     * This is present since this project does not have mockito.
     */
    private class SimpleInvocationHandler implements InvocationHandler {

        private Object wrapped;
        private final Map<String, MethodInterceptor> interceptors = new HashMap<>();

        public SimpleInvocationHandler(Object wrapped) {
            this.wrapped = wrapped;
        }

        @Override
        public Object invoke(Object proxy, Method method, Object... args) throws Throwable {
            MethodInterceptor methodInterceptor = interceptors.get(method.getName());
            Object result;
            if (methodInterceptor != null) {
                result = methodInterceptor.invoke(wrapped, args);
            } else {
                method.invoke(wrapped, args);
                result = method.invoke(wrapped, args);
            }
            return result;
        }

        public void addInterceptor(MethodInterceptor interceptor) {
            interceptors.put(interceptor.name, interceptor);
        }
    }

    /**
     * Simple method interceptor.
     * This is present since this project does not have mockito.
     * @param <T>
     * @param <R>
     */
    private class MethodInterceptor<T, R> {

        private String name;
        private Method method;

        public MethodInterceptor(Class<?> clazz, String name, Class<?>... parameterTypes) {
            this.name = name;
            try {
                method = clazz.getDeclaredMethod(name, parameterTypes);
            } catch (NoSuchMethodException e) {
                logger.error(e);
            }
        }

        R invoke(T o, Object[] args) throws InvocationTargetException {
            try {
                return (R) method.invoke((Object) o, args);
            } catch (IllegalAccessException e) {
                logger.error(e);
            }
            return null;
        }
    }

    private class GetLocationTestRunner implements Callable<Boolean> {

        @Override
        public Boolean call() throws Exception {
            LocationResolverRdbms locationResolverRdbms = new LocationResolverRdbms();
            locationResolverRdbms.setPersistInDataBase(true);
            Location location1 = locationResolverRdbms.getLocation("192.168.2.1");
            Assert.assertNotNull(location1);
            Assert.assertNotNull(location1.getCountry());
            Assert.assertEquals(location1.getCountry(), "Germany");
            return Boolean.TRUE;
        }
    }
}
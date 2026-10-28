package com.taskflow;

import java.sql.*;
import java.util.UUID;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class AssetMigrationTest {
    @Test void memberMigrationPreservesClosedRepairCostsAndExistingAccounts()throws Exception{
        String url="jdbc:h2:mem:member-migration-"+UUID.randomUUID()+";DB_CLOSE_DELAY=-1";
        Flyway.configure().dataSource(url,"sa","").target("5").load().migrate();
        try(var connection=DriverManager.getConnection(url,"sa","");var statement=connection.createStatement()){
            statement.executeUpdate("INSERT INTO ff_users(id,name,email,password_hash,role,enabled,created_at) VALUES(1,'Existing member','old@example.com','unchanged-hash','CUSTOMER',TRUE,CURRENT_TIMESTAMP)");
            statement.executeUpdate("INSERT INTO ff_tickets(id,version,ticket_no,title,description,location,category,priority,status,created_by_id,created_at,updated_at,due_at) VALUES(1,4,'OLD-CLOSED','Closed repair','Keep history','Room','OTHER','LOW','CLOSED',1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)");
            statement.executeUpdate("INSERT INTO ff_entries(id,ticket_id,author_id,kind,content,created_at,work_hours,labor_cost,parts_cost,total_cost) VALUES(1,1,1,'REPAIR','Original work',CURRENT_TIMESTAMP,1,200,50,250)");
            statement.executeUpdate("INSERT INTO ff_repair_parts(entry_id,line_no,part_name,quantity,unit_price,line_total) VALUES(1,0,'Original part',2,25,50)");
            Flyway.configure().dataSource(url,"sa","").load().migrate();
            try(var rows=statement.executeQuery("SELECT role,password_hash FROM ff_users WHERE id=1")){assertTrue(rows.next());assertEquals("CUSTOMER",rows.getString(1));assertEquals("unchanged-hash",rows.getString(2));}
            try(var rows=statement.executeQuery("SELECT status,version FROM ff_tickets WHERE id=1")){assertTrue(rows.next());assertEquals("CLOSED",rows.getString(1));assertEquals(4,rows.getInt(2));}
            try(var rows=statement.executeQuery("SELECT content,total_cost FROM ff_entries WHERE id=1")){assertTrue(rows.next());assertEquals("Original work",rows.getString(1));assertEquals(0,new java.math.BigDecimal("250.00").compareTo(rows.getBigDecimal(2)));}
            try(var rows=statement.executeQuery("SELECT part_name,line_total FROM ff_repair_parts WHERE entry_id=1")){assertTrue(rows.next());assertEquals("Original part",rows.getString(1));assertEquals(50,rows.getInt(2));}
            try(var rows=statement.executeQuery("SELECT COUNT(*) FROM ff_part_requests")){assertTrue(rows.next());assertEquals(0,rows.getInt(1));}
        }
    }
    @Test void upgradesExistingTicketsWithoutLosingData()throws Exception{
        String url="jdbc:h2:mem:asset-migration-"+UUID.randomUUID()+";DB_CLOSE_DELAY=-1";
        Flyway.configure().dataSource(url,"sa","").target("1").load().migrate();
        try(var connection=DriverManager.getConnection(url,"sa","");var statement=connection.createStatement()){
            statement.executeUpdate("INSERT INTO ff_users(id,name,email,password_hash,role,enabled,created_at) VALUES(1,'Old owner','migration@example.com','test-only','CUSTOMER',TRUE,CURRENT_TIMESTAMP)");
            statement.executeUpdate("INSERT INTO ff_tickets(id,version,ticket_no,title,description,location,category,priority,status,created_by_id,created_at,updated_at,due_at) VALUES(1,0,'OLD-001','Existing repair','Keep this record','3F','OTHER','LOW','OPEN',1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)");
            statement.executeUpdate("INSERT INTO ff_entries(id,ticket_id,author_id,kind,content,created_at) VALUES(1,1,1,'REPAIR','Existing repair notes',CURRENT_TIMESTAMP)");
            Flyway.configure().dataSource(url,"sa","").load().migrate();
            try(var rows=statement.executeQuery("SELECT title,asset_id FROM ff_tickets WHERE id=1")){
                assertTrue(rows.next());assertEquals("Existing repair",rows.getString("title"));assertNull(rows.getObject("asset_id"));
            }
            try(var rows=statement.executeQuery("SELECT COUNT(*) FROM ff_assets")){assertTrue(rows.next());assertEquals(0,rows.getInt(1));}
            try(var rows=statement.executeQuery("SELECT content,work_hours,total_cost FROM ff_entries WHERE id=1")){assertTrue(rows.next());assertEquals("Existing repair notes",rows.getString("content"));assertNull(rows.getObject("work_hours"));assertNull(rows.getObject("total_cost"));}
            try(var rows=statement.executeQuery("SELECT COUNT(*) FROM ff_repair_parts")){assertTrue(rows.next());assertEquals(0,rows.getInt(1));}
        }
    }
}

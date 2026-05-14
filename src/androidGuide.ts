import { AndroidFileNode } from "./types";

export interface AndroidStep {
  id: number;
  title: string;
  description: string;
  checklist: string[];
}

export const androidSteps: AndroidStep[] = [
  {
    id: 1,
    title: "1. Create App Project in Android Studio",
    description: "Initialize your workspace in Android Studio with standard configurations and support for Java.",
    checklist: [
      "Open Android Studio, click 'New Project'.",
      "Select 'Empty Views Activity' (important: do NOT choose Empty Activity, as that defaults to Jetpack Compose - we want Java XML Views for a rich classic project).",
      "Set name to 'WhatsApp Chat Analyzer'.",
      "Select Language: 'Java' and Minimum SDK: 'API 26: Android 8.0' (Oreo) or higher.",
      "Click Finish and wait for Gradle to sync."
    ]
  },
  {
    id: 2,
    title: "2. Add Gradle Dependencies & Permissions",
    description: "Add MPAndroidChart for beautiful analytics graphs, Gson for data handling, and declare storage permissions in the AndroidManifest.",
    checklist: [
      "Open 'settings.gradle' or your root 'build.gradle' and add the MPAndroidChart JCenter/JitPack repository.",
      "Open your app-level 'build.gradle' and add the charting and utility dependencies.",
      "Sync Gradle to fetch dependencies.",
      "Open 'AndroidManifest.xml' and request 'READ_EXTERNAL_STORAGE' (for older APIs) and configure the FileProvider for secure file sharing/viewing."
    ]
  },
  {
    id: 3,
    title: "3. Build the SQLite Multi-Chat Database",
    description: "Setup SQLite/Room to save imported chats so users can switch between multiple chats and delete them, satisfying the 'imported chat save, and we can add another' requirement.",
    checklist: [
      "Create 'DatabaseHelper.java' which inherits from SQLiteOpenHelper.",
      "Configure tables: 'chats' (stores metadata like chat name, import date) and 'messages' (stores parsed WhatsApp messages linked to their chat_id).",
      "Implement helper methods: saveChat(), getAllChats(), getChatMessages(), and deleteChat()."
    ]
  },
  {
    id: 4,
    title: "4. Create the Chat Text & ZIP RegEx Parser",
    description: "Develop the line-by-line WhatsApp text parser using Regular Expressions. Multi-line messages must be contextually appended to their preceding message sender, a crucial detail!",
    checklist: [
      "Create the entity class 'ChatMessage.java' with sender, text, timestamp, isSystem, and isMedia flags.",
      "Create 'ChatParser.java' which takes an InputStream of the text file and parses it line-by-line using Regex.",
      "Add support for both 12-hour AM/PM and 24-hour formats, as WhatsApp changes format based on device locale.",
      "Add support for extracting text files inside compressed '.zip' archives using Java's 'ZipInputStream'."
    ]
  },
  {
    id: 5,
    title: "5. Setup RecyclerViews & WhatsApp Bubble Layouts",
    description: "Build the chat UI. Create custom bubble drawables for incoming (neutral/white message bubble) and outgoing (green bubble) messages, and wire them up using a customized RecyclerView adapter.",
    checklist: [
      "Create green bubble background drawable code 'bubble_outgoing.xml' and gray bubble 'bubble_incoming.xml'.",
      "Design layout files: 'item_message_incoming.xml' and 'item_message_outgoing.xml'.",
      "Create 'ChatAdapter.java' extending RecyclerView.Adapter, overriding getItemViewType() to distinguish incoming from outgoing based on standard names or user roles."
    ]
  },
  {
    id: 6,
    title: "6. Design and Bind Core Activities",
    description: "Design the dashboard showing user percentages, word counts, and visual charts of the chat session's metrics, and bind them with interactive triggers.",
    checklist: [
      "Create 'MainActivity.java' with a FAB to open the file explorer and pick `.txt` or `.zip` files, and a list of saved chats.",
      "Create 'ChatDetailActivity.java' hosting a beautiful XML Layout containing view tabs (Chat Messages vs. Analytics Charts).",
      "Initialize 'BarChart' & 'PieChart' from MPAndroidChart inside the analytics fragment/layout to display hourly chats and sender shares.",
      "Compile, deploy, and inspect on your Android emulator or physical device!"
    ]
  }
];

export const androidCodeTree: AndroidFileNode[] = [
  {
    path: "/app/build.gradle",
    name: "build.gradle (Module: app)",
    type: "file",
    language: "gradle",
    description: "Configure app dependencies, targeting SDKs, enabling Java 8 characteristics, and including MPAndroidChart for charts & Gson for serialization.",
    content: `plugins {
    id 'com.android.application'
}

android {
    namespace 'com.whatsapp.chatanalyzer'
    compileSdk 34

    defaultConfig {
        applicationId "com.whatsapp.chatanalyzer"
        minSdk 26
        targetSdk 34
        versionCode 1
        versionName "1.0"

        testInstrumentationRunner "androidx.test.runner.AndroidJUnitRunner"
    }

    buildTypes {
        release {
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
    compileOptions {
        sourceCompatibility JavaVersion.VERSION_1_8
        targetCompatibility JavaVersion.VERSION_1_8
    }
}

dependencies {
    implementation 'androidx.appcompat:appcompat:1.6.1'
    implementation 'com.google.android.material:material:1.11.0'
    implementation 'androidx.constraintlayout:constraintlayout:2.1.4'
    
    // MPAndroidChart for stunning stats visualizations
    implementation 'github.com/PhilJay:MPAndroidChart:v3.1.0'
    
    // Gson for simple JSON/Object mapping
    implementation 'com.google.code.gson:gson:2.10.1'

    testImplementation 'junit:junit:4.13.2'
    androidTestImplementation 'androidx.test.ext:junit:1.1.5'
    androidTestImplementation 'androidx.test.espresso:espresso-core:3.5.1'
}`
  },
  {
    path: "/settings.gradle",
    name: "settings.gradle",
    type: "file",
    language: "gradle",
    description: "This file configures dependencies resolution repositories. MPAndroidChart requires JitPack repository, which we include here.",
    content: `pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
        // Jitpack is required to automatically fetch and compile MPAndroidChart
        maven { url 'https://jitpack.io' }
    }
}
rootProject.name = "WhatsApp Chat Analyzer"`
  },
  {
    path: "/app/src/main/AndroidManifest.xml",
    name: "AndroidManifest.xml",
    type: "file",
    language: "xml",
    description: "Declare application structure, the list of interactive activities (Main Hub and Detailed Chat/Analytics view), and standard file system provider config.",
    content: `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

    <!-- Declare storage read request to access files picked from directories -->
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" android:maxSdkVersion="32" />

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="WA Chat Analyzer"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/Theme.Material3.DayNight.NoActionBar">
        
        <!-- Main hub activity listing all saved chats -->
        <activity
            android:name=".MainActivity"
            android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
        
        <!-- Chat Detail activity with TabLayout (Messages list & visual analytics charts) -->
        <activity
            android:name=".ChatDetailActivity"
            android:parentActivityName=".MainActivity"
            android:exported="false" />

    </application>

</manifest>`
  },
  {
    path: "/app/src/main/java/com/whatsapp/chatanalyzer/models/ChatMessage.java",
    name: "ChatMessage.java",
    type: "file",
    language: "java",
    description: "Data Model class representing a single WhatsApp Message, highlighting sender details, time metadata, raw message text, and helper checks.",
    content: `package com.whatsapp.chatanalyzer.models;

public class ChatMessage {
    private String sender;
    private String content;
    private String timestamp; // Raw string format, e.g. "14/05/2026, 12:34"
    private boolean isSystem; // System status reports like 'Security code changed'
    private boolean isMedia;  // Media attachments like '<Media omitted>'

    public ChatMessage(String sender, String content, String timestamp, boolean isSystem, boolean isMedia) {
        this.sender = sender;
        this.content = content;
        this.timestamp = timestamp;
        this.isSystem = isSystem;
        this.isMedia = isMedia;
    }

    public String getSender() { return sender; }
    public void setSender(String sender) { this.sender = sender; }

    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }

    public String getTimestamp() { return timestamp; }
    public void setTimestamp(String timestamp) { this.timestamp = timestamp; }

    public boolean isSystem() { return isSystem; }
    public void setSystem(boolean system) { isSystem = system; }

    public boolean isMedia() { return isMedia; }
    public void setMedia(boolean media) { isMedia = media; }
    
    // Quick helper to fetch date part for timeline metrics: "dd/MM/yyyy"
    public String getDateOnly() {
        if (timestamp == null || timestamp.length() < 10) return "Unknown";
        return timestamp.split(",")[0].trim();
    }
    
    // Quick helper to compile hour logic: returns integer 0-23
    public int getHour() {
        try {
            if (timestamp == null || !timestamp.contains(" ")) return 12;
            String timePart = timestamp.substring(timestamp.indexOf(",") + 1).trim();
            String[] parts = timePart.split(" ");
            String[] hms = parts[0].split(":");
            int hour = Integer.parseInt(hms[0]);
            
            if (parts.length > 1) { // 12-hour AM/PM formatting
                String ampm = parts[1].toLowerCase();
                if (ampm.contains("pm") && hour < 12) hour += 12;
                if (ampm.contains("am") && hour == 12) hour = 0;
            }
            return hour;
        } catch (Exception e) {
            return 12; // Fail-safe default
        }
    }
}`
  },
  {
    path: "/app/src/main/java/com/whatsapp/chatanalyzer/parser/ChatParser.java",
    name: "ChatParser.java",
    type: "file",
    language: "java",
    description: "Crucial engine. Parses raw text stream of exported chat. Employs regex structures to identify timestamps and split the message. Concatenates multi-line content correctly onto the last active message.",
    content: `package com.whatsapp.chatanalyzer.parser;

import com.whatsapp.chatanalyzer.models.ChatMessage;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

public class ChatParser {

    // Supports regular formats:
    // 1) 14/05/26, 12:34 - Member name: Message text
    // 2) 14/05/2026, 12:34 PM - Member name: Message text / [14/05/2026, 12:34:56]
    private static final Pattern STANDARD_PATTERN = Pattern.compile(
        "^[\\[\\(]?(\\\\d{1,4}[/\\\\.-]\\\\d{1,2}[/\\\\.-]\\\\d{1,4},?\\\\s+\\\\d{1,2}:\\\\d{2}(?::\\\\d{2})?\\\\s*(?:[aApP][mM])?)[\\]\\)]?\\\\s*[-–]?\\\\s*(.+)$"
    );

    /**
     * Read from raw text stream line by line and compile a List of ChatMessage objects.
     */
    public static List<ChatMessage> parseChat(InputStream inputStream) throws IOException {
        List<ChatMessage> messages = new ArrayList<>();
        BufferedReader reader = new BufferedReader(new InputStreamReader(inputStream, StandardCharsets.UTF_8));
        String line;
        ChatMessage lastMessage = null;

        while ((line = reader.readLine()) != null) {
            line = line.trim();
            if (line.isEmpty()) continue;

            Matcher matcher = STANDARD_PATTERN.matcher(line);
            if (matcher.matches()) {
                String timestamp = matcher.group(1).trim();
                String rest = matcher.group(2).trim();

                // Check if it's formatted as Sender: Message
                int colonIndex = rest.indexOf(":");
                if (colonIndex > 0 && !rest.startsWith("M")) { // simple system indicator check
                    String sender = rest.substring(0, colonIndex).trim();
                    String content = rest.substring(colonIndex + 1).trim();
                    
                    boolean isMedia = content.contains("<Media omitted>") || 
                                     content.contains("file attached") || 
                                     content.toLowerCase().contains("omitted");
                    
                    lastMessage = new ChatMessage(sender, content, timestamp, false, isMedia);
                    messages.add(lastMessage);
                } else {
                    // It's a system message (e.g., 'Joe created group' or 'Messages are end-to-end encrypted')
                    lastMessage = new ChatMessage("System", rest, timestamp, true, false);
                    messages.add(lastMessage);
                }
            } else {
                // Continuation line of multi-line message (frequent in WhatsApp exports!)
                if (lastMessage != null) {
                    lastMessage.setContent(lastMessage.getContent() + "\\n" + line);
                } else if (!messages.isEmpty()) {
                    ChatMessage absoluteLast = messages.get(messages.size() - 1);
                    absoluteLast.setContent(absoluteLast.getContent() + "\\n" + line);
                }
            }
        }
        reader.close();
        return messages;
    }

    /**
     * Unwraps zipped archives (.zip), locates the primary chat .txt file, parses, and returns the models.
     */
    public static List<ChatMessage> parseZip(InputStream zipInputStream) throws IOException {
        ZipInputStream zis = new ZipInputStream(zipInputStream);
        ZipEntry entry;
        while ((entry = zis.getNextEntry()) != null) {
            if (!entry.isDirectory() && entry.getName().endsWith(".txt") && !entry.getName().startsWith("__MACOSX")) {
                // WhatsApp chats usually pack as: _chat.txt or WhatsApp Chat.txt
                return parseChat(zis);
            }
            zis.closeEntry();
        }
        throw new IOException("No matching .txt chat file found inside the zipped archive!");
    }
}`
  },
  {
    path: "/app/src/main/java/com/whatsapp/chatanalyzer/database/DatabaseHelper.java",
    name: "DatabaseHelper.java",
    type: "file",
    language: "java",
    description: "Database handling system. Local SQLite interface with commands to create, update, retrieve multiple distinct chats, and retrieve complete sets of messages.",
    content: `package com.whatsapp.chatanalyzer.database;

import android.content.ContentValues;
import android.content.Context;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteOpenHelper;
import com.whatsapp.chatanalyzer.models.ChatMessage;
import java.util.ArrayList;
import java.util.List;

public class DatabaseHelper extends SQLiteOpenHelper {

    private static final String DATABASE_NAME = "WhatsAppChats.db";
    private static final int DATABASE_VERSION = 1;

    // Table names
    public static final String TABLE_CHATS = "chats";
    public static final String TABLE_MESSAGES = "messages";

    // Common column names
    public static final String KEY_ID = "id";

    // Chats table columns
    public static final String KEY_CHAT_NAME = "chat_name";
    public static final String KEY_IMPORTED_AT = "imported_at";

    // Messages table columns
    public static final String KEY_CHAT_ID = "chat_id";
    public static final String KEY_SENDER = "sender";
    public static final String KEY_CONTENT = "content";
    public static final String KEY_TIMESTAMP = "timestamp";
    public static final String KEY_IS_SYSTEM = "is_system";
    public static final String KEY_IS_MEDIA = "is_media";

    public DatabaseHelper(Context context) {
        super(context, DATABASE_NAME, null, DATABASE_VERSION);
    }

    @Override
    public void onCreate(SQLiteDatabase db) {
        // Create Chats list table
        String CREATE_CHATS_TABLE = "CREATE TABLE " + TABLE_CHATS + " ("
                + KEY_ID + " INTEGER PRIMARY KEY AUTOINCREMENT,"
                + KEY_CHAT_NAME + " TEXT,"
                + KEY_IMPORTED_AT + " TEXT" + ")";

        // Create Messages storage table
        String CREATE_MESSAGES_TABLE = "CREATE TABLE " + TABLE_MESSAGES + " ("
                + KEY_ID + " INTEGER PRIMARY KEY AUTOINCREMENT,"
                + KEY_CHAT_ID + " INTEGER,"
                + KEY_SENDER + " TEXT,"
                + KEY_CONTENT + " TEXT,"
                + KEY_TIMESTAMP + " TEXT,"
                + KEY_IS_SYSTEM + " INTEGER,"
                + KEY_IS_MEDIA + " INTEGER" + ")";

        db.execSQL(CREATE_CHATS_TABLE);
        db.execSQL(CREATE_MESSAGES_TABLE);
    }

    @Override
    public void onUpgrade(SQLiteDatabase db, int oldVersion, int newVersion) {
        db.execSQL("DROP TABLE IF EXISTS " + TABLE_CHATS);
        db.execSQL("DROP TABLE IF EXISTS " + TABLE_MESSAGES);
        onCreate(db);
    }

    /**
     * Commits a new chat session metadata and all parsed messages atomically.
     */
    public long insertChat(String chatName, String importedAt, List<ChatMessage> messages) {
        SQLiteDatabase db = this.getWritableDatabase();
        long chatID = -1;

        db.beginTransaction();
        try {
            ContentValues chatValues = new ContentValues();
            chatValues.put(KEY_CHAT_NAME, chatName);
            chatValues.put(KEY_IMPORTED_AT, importedAt);
            chatID = db.insert(TABLE_CHATS, null, chatValues);

            if (chatID != -1) {
                for (ChatMessage msg : messages) {
                    ContentValues msgValues = new ContentValues();
                    msgValues.put(KEY_CHAT_ID, chatID);
                    msgValues.put(KEY_SENDER, msg.getSender());
                    msgValues.put(KEY_CONTENT, msg.getContent());
                    msgValues.put(KEY_TIMESTAMP, msg.getTimestamp());
                    msgValues.put(KEY_IS_SYSTEM, msg.isSystem() ? 1 : 0);
                    msgValues.put(KEY_IS_MEDIA, msg.isMedia() ? 1 : 0);
                    db.insert(TABLE_MESSAGES, null, msgValues);
                }
            }
            db.setTransactionSuccessful();
        } finally {
            db.endTransaction();
        }
        return chatID;
    }

    /**
     * Deletes a chat and its cascade list of messages.
     */
    public void deleteChat(long chatId) {
        SQLiteDatabase db = this.getWritableDatabase();
        db.beginTransaction();
        try {
            db.delete(TABLE_CHATS, KEY_ID + " = ?", new String[]{String.valueOf(chatId)});
            db.delete(TABLE_MESSAGES, KEY_CHAT_ID + " = ?", new String[]{String.valueOf(chatId)});
            db.setTransactionSuccessful();
        } finally {
            db.endTransaction();
        }
    }

    /**
     * Retrieve a cursor map listing all imported chats.
     */
    public Cursor getAllChatsCursor() {
        SQLiteDatabase db = this.getReadableDatabase();
        return db.rawQuery("SELECT id as _id, chat_name, imported_at FROM " + TABLE_CHATS + " ORDER BY id DESC", null);
    }

    /**
     * Reads all recorded messages for a specific chat ID.
     */
    public List<ChatMessage> getChatMessages(long chatId) {
        List<ChatMessage> list = new ArrayList<>();
        SQLiteDatabase db = this.getReadableDatabase();
        Cursor cursor = db.rawQuery("SELECT * FROM " + TABLE_MESSAGES + " WHERE " + KEY_CHAT_ID + " = " + chatId + " ORDER BY id ASC", null);

        if (cursor.moveToFirst()) {
            do {
                String sender = cursor.getString(cursor.getColumnIndexOrThrow(KEY_SENDER));
                String content = cursor.getString(cursor.getColumnIndexOrThrow(KEY_CONTENT));
                String timestamp = cursor.getString(cursor.getColumnIndexOrThrow(KEY_TIMESTAMP));
                boolean isSystem = cursor.getInt(cursor.getColumnIndexOrThrow(KEY_IS_SYSTEM)) == 1;
                boolean isMedia = cursor.getInt(cursor.getColumnIndexOrThrow(KEY_IS_MEDIA)) == 1;

                list.add(new ChatMessage(sender, content, timestamp, isSystem, isMedia));
            } while (cursor.moveToNext());
        }
        cursor.close();
        return list;
    }
}`
  },
  {
    path: "/app/src/main/java/com/whatsapp/chatanalyzer/MainActivity.java",
    name: "MainActivity.java",
    type: "file",
    language: "java",
    description: "Launch Pad. Display active chats catalog in database. Handle text/zip file pickers, call the parser asynchronously in an Executor, save results, and route click gestures to Detail layouts.",
    content: `package com.whatsapp.chatanalyzer;

import android.app.Activity;
import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.os.Bundle;
import android.view.View;
import android.widget.TextView;
import android.widget.Toast;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.appcompat.app.AppCompatActivity;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;
import com.google.android.material.floatingactionbutton.FloatingActionButton;
import com.whatsapp.chatanalyzer.database.DatabaseHelper;
import com.whatsapp.chatanalyzer.models.ChatMessage;
import com.whatsapp.chatanalyzer.parser.ChatParser;
import java.io.InputStream;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.List;
import java.util.Locale;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class MainActivity extends AppCompatActivity {

    private DatabaseHelper dbHelper;
    private RecyclerView rvChats;
    private TextView tvEmptyState;
    private FloatingActionButton fabImport;
    private ExecutorService diskExecutor;
    private ActivityResultLauncher<Intent> filePickerLauncher;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        dbHelper = new DatabaseHelper(this);
        diskExecutor = Executors.newSingleThreadExecutor();

        rvChats = findViewById(R.id.rvChats);
        tvEmptyState = findViewById(R.id.tvEmptyState);
        fabImport = findViewById(R.id.fabImport);

        rvChats.setLayoutManager(new LinearLayoutManager(this));
        
        // Initialize the File Picker Intent Listener
        filePickerLauncher = registerForActivityResult(
                new ActivityResultContracts.StartActivityForResult(),
                result -> {
                    if (result.getResultCode() == Activity.RESULT_OK && result.getData() != null) {
                        Uri selectedUri = result.getData().getData();
                        if (selectedUri != null) {
                            processSelectedFile(selectedUri);
                        }
                    }
                }
        );

        fabImport.setOnClickListener(v -> triggerFilePicker());
        loadChats();
    }

    private void triggerFilePicker() {
        Intent intent = new Intent(Intent.ACTION_GET_CONTENT);
        intent.setType("*/*"); // can accept TXT or ZIP
        String[] mimeTypes = {"text/plain", "application/zip", "application/x-zip-compressed"};
        intent.putExtra(Intent.EXTRA_MIME_TYPES, mimeTypes);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        filePickerLauncher.launch(Intent.createChooser(intent, "Select WhatsApp Chat Export (.txt / .zip)"));
    }

    private void processSelectedFile(Uri uri) {
        Toast.makeText(this, "Analyzing chat file...", Toast.LENGTH_SHORT).show();
        
        diskExecutor.execute(() -> {
            try {
                String fileName = "WhatsApp Chat (" + new SimpleDateFormat("dd MMM", Locale.getDefault()).format(new Date()) + ")";
                Cursor returnCursor = getContentResolver().query(uri, null, null, null, null);
                if (returnCursor != null) {
                    int nameIndex = returnCursor.getColumnIndex("_display_name");
                    if (nameIndex != -1 && returnCursor.moveToFirst()) {
                        String name = returnCursor.getString(nameIndex);
                        if (name != null) fileName = name.replace(".txt", "").replace(".zip", "");
                    }
                    returnCursor.close();
                }

                InputStream is = getContentResolver().openInputStream(uri);
                List<ChatMessage> parsedMessages;
                
                if (uri.toString().endsWith(".zip") || fileName.endsWith(".zip") || uri.getPath().endsWith(".zip")) {
                    parsedMessages = ChatParser.parseZip(is);
                } else {
                    parsedMessages = ChatParser.parseChat(is);
                }

                if (parsedMessages.isEmpty()) {
                    runOnUiThread(() -> Toast.makeText(this, "We couldn't parse any messages. Is it a valid WhatsApp export?", Toast.LENGTH_LONG).show());
                    return;
                }

                String importDate = new SimpleDateFormat("yyyy-MM-dd HH:mm", Locale.getDefault()).format(new Date());
                long insertedId = dbHelper.insertChat(fileName, importDate, parsedMessages);

                runOnUiThread(() -> {
                    Toast.makeText(this, "Chat Saved successfully! " + parsedMessages.size() + " messages loaded.", Toast.LENGTH_SHORT).show();
                    loadChats();
                    // Auto-open detail layout
                    openChatDetails(insertedId, fileName);
                });

            } catch (Exception e) {
                runOnUiThread(() -> Toast.makeText(this, "Failed to parse file: " + e.getLocalizedMessage(), Toast.LENGTH_LONG).show());
            }
        });
    }

    private void loadChats() {
        diskExecutor.execute(() -> {
            Cursor cursor = dbHelper.getAllChatsCursor();
            boolean hasChats = cursor != null && cursor.getCount() > 0;
            
            runOnUiThread(() -> {
                if (hasChats) {
                    tvEmptyState.setVisibility(View.GONE);
                    rvChats.setVisibility(View.VISIBLE);
                    
                    // Simple adaptor implementation triggers detail navigation
                    ChatListAdapter adapter = new ChatListAdapter(cursor, (chatId, chatName) -> openChatDetails(chatId, chatName), chatId -> {
                        dbHelper.deleteChat(chatId);
                        Toast.makeText(this, "Chat deleted", Toast.LENGTH_SHORT).show();
                        loadChats();
                    });
                    rvChats.setAdapter(adapter);
                } else {
                    tvEmptyState.setVisibility(View.VISIBLE);
                    rvChats.setVisibility(View.GONE);
                }
            });
        });
    }

    private void openChatDetails(long id, String name) {
        Intent intent = new Intent(this, ChatDetailActivity.class);
        intent.putExtra("CHAT_ID", id);
        intent.putExtra("CHAT_NAME", name);
        startActivity(intent);
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        diskExecutor.shutdown();
    }
}`
  },
  {
    path: "/app/src/main/java/com/whatsapp/chatanalyzer/ChatDetailActivity.java",
    name: "ChatDetailActivity.java",
    type: "file",
    language: "java",
    description: "Multi-tab UI. Uses views to toggle between standard scrollable WhatsApp conversation logs and high-performance MPAndroidChart statistics graphs.",
    content: `package com.whatsapp.chatanalyzer;

import android.os.Bundle;
import android.text.Editable;
import android.text.TextWatcher;
import android.view.View;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.TextView;
import androidx.appcompat.app.AppCompatActivity;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;
import com.github.mikephil.charting.charts.BarChart;
import com.github.mikephil.charting.charts.PieChart;
import com.github.mikephil.charting.data.BarData;
import com.github.mikephil.charting.data.BarDataSet;
import com.github.mikephil.charting.data.BarEntry;
import com.github.mikephil.charting.data.PieData;
import com.github.mikephil.charting.data.PieDataSet;
import com.github.mikephil.charting.data.PieEntry;
import com.github.mikephil.charting.utils.ColorTemplate;
import com.whatsapp.chatanalyzer.adapters.ChatAdapter;
import com.whatsapp.chatanalyzer.database.DatabaseHelper;
import com.whatsapp.chatanalyzer.models.ChatMessage;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class ChatDetailActivity extends AppCompatActivity {

    private long chatId;
    private String chatName;
    private DatabaseHelper dbHelper;
    private ExecutorService diskExecutor;

    private LinearLayout layoutChat, layoutAnalytics;
    private RecyclerView rvMessages;
    private TextView tvTabChat, tvTabAnalytics;
    private TextView tvTotalMsg, tvParticipantCount, tvMediaCount, tvWordCount;
    private EditText etSearch;

    private BarChart barChartHourly;
    private PieChart pieChartParticipants;
    private List<ChatMessage> allMessages = new ArrayList<>();
    private ChatAdapter chatAdapter;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_chat_detail);

        dbHelper = new DatabaseHelper(this);
        diskExecutor = Executors.newSingleThreadExecutor();

        chatId = getIntent().getLongExtra("CHAT_ID", -1);
        chatName = getIntent().getStringExtra("CHAT_NAME");

        TextView tvTitle = findViewById(R.id.tvToolbarTitle);
        tvTitle.setText(chatName != null ? chatName : "Chat View");

        layoutChat = findViewById(R.id.layoutChatTab);
        layoutAnalytics = findViewById(R.id.layoutAnalyticsTab);
        rvMessages = findViewById(R.id.rvMessages);
        etSearch = findViewById(R.id.etSearch);

        tvTabChat = findViewById(R.id.tvTabChat);
        tvTabAnalytics = findViewById(R.id.tvTabAnalytics);

        barChartHourly = findViewById(R.id.barChartHourly);
        pieChartParticipants = findViewById(R.id.pieChartParticipants);

        tvTotalMsg = findViewById(R.id.tvStatTotalMessages);
        tvParticipantCount = findViewById(R.id.tvStatParticipants);
        tvMediaCount = findViewById(R.id.tvStatMedia);
        tvWordCount = findViewById(R.id.tvStatWords);

        rvMessages.setLayoutManager(new LinearLayoutManager(this));

        // Toggle Tab View Logic
        tvTabChat.setOnClickListener(v -> switchTab(true));
        tvTabAnalytics.setOnClickListener(v -> switchTab(false));

        findViewById(R.id.btnBack).setOnClickListener(v -> onBackPressed());

        // Search messages feature
        etSearch.addTextChangedListener(new TextWatcher() {
            @Override
            public void beforeTextChanged(CharSequence s, int start, int count, int after) {}
            @Override
            public void onTextChanged(CharSequence s, int start, int before, int count) {
                if (chatAdapter != null) chatAdapter.filter(s.toString());
            }
            @Override
            public void afterTextChanged(Editable s) {}
        });

        loadData();
    }

    private void switchTab(boolean showChat) {
        if (showChat) {
            tvTabChat.setBackgroundResource(R.drawable.tab_selected_bg);
            tvTabAnalytics.setBackgroundResource(R.color.transparent);
            layoutChat.setVisibility(View.VISIBLE);
            layoutAnalytics.setVisibility(View.GONE);
        } else {
            tvTabAnalytics.setBackgroundResource(R.drawable.tab_selected_bg);
            tvTabChat.setBackgroundResource(R.color.transparent);
            layoutChat.setVisibility(View.GONE);
            layoutAnalytics.setVisibility(View.VISIBLE);
            setupChartsAndAnalytics();
        }
    }

    private void loadData() {
        diskExecutor.execute(() -> {
            allMessages = dbHelper.getChatMessages(chatId);
            runOnUiThread(() -> {
                chatAdapter = new ChatAdapter(allMessages);
                rvMessages.setAdapter(chatAdapter);
                rvMessages.scrollToPosition(allMessages.size() - 1);
                
                // Prefill basic text view values
                tvTotalMsg.setText(String.valueOf(allMessages.size()));
            });
        });
    }

    private void setupChartsAndAnalytics() {
        long totalWords = 0;
        int mediaCount = 0;
        Map<String, Integer> userCounts = new HashMap<>();
        int[] hourlyCount = new int[24];

        for (ChatMessage msg : allMessages) {
            if (msg.isSystem()) continue;

            // Sender stats
            userCounts.put(msg.getSender(), userCounts.getOrDefault(msg.getSender(), 0) + 1);

            // Time slots
            hourlyCount[msg.getHour()]++;

            // Media & Words
            if (msg.isMedia()) {
                mediaCount++;
            } else {
                totalWords += msg.getContent().split("\\\\s+").length;
            }
        }

        tvParticipantCount.setText(String.valueOf(userCounts.size()));
        tvMediaCount.setText(String.valueOf(mediaCount));
        tvWordCount.setText(String.format(Locale.getDefault(), "%,d", totalWords));

        // Draw Interactive Pie Chart (User Breakdown)
        List<PieEntry> pieEntries = new ArrayList<>();
        for (Map.Entry<String, Integer> entry : userCounts.entrySet()) {
            pieEntries.add(new PieEntry(entry.getValue(), entry.getKey()));
        }

        PieDataSet pieDataSet = new PieDataSet(pieEntries, "Messages share");
        pieDataSet.setColors(ColorTemplate.COLORFUL_COLORS);
        pieDataSet.setValueTextSize(12f);
        PieData pieData = new PieData(pieDataSet);
        pieChartParticipants.setData(pieData);
        pieChartParticipants.setDescription(null);
        pieChartParticipants.animateX(800);
        pieChartParticipants.invalidate();

        // Draw Hourly Bar Chart (Activity Heatmap)
        List<BarEntry> barEntries = new ArrayList<>();
        for (int i = 0; i < 24; i++) {
            barEntries.add(new BarEntry(i, hourlyCount[i]));
        }

        BarDataSet barDataSet = new BarDataSet(barEntries, "Hourly Density");
        barDataSet.setColor(ColorTemplate.JOYFUL_COLORS[0]);
        barDataSet.setValueTextSize(8f);
        BarData barData = new BarData(barDataSet);
        barChartHourly.setData(barData);
        barChartHourly.setDescription(null);
        barChartHourly.animateY(1000);
        barChartHourly.invalidate();
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        diskExecutor.shutdown();
    }
}`
  },
  {
    path: "/app/src/main/res/layout/activity_main.xml",
    name: "activity_main.xml (Main Layout)",
    type: "file",
    language: "xml",
    description: "Welcome UI displaying general logo, list of imported files stored securely in SQLite, empty state illustrations, and a beautiful Float Action Button (FAB) to browse memory.",
    content: `<?xml version="1.0" encoding="utf-8"?>
<androidx.constraintlayout.widget.ConstraintLayout xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:app="http://schemas.android.com/apk/res-auto"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:background="#ECE5DD"> <!-- Classic light gray-green WhatsApp wallpaper color -->

    <!-- Top Bar -->
    <androidx.appcompat.widget.Toolbar
        android:id="@+id/toolbar"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:background="#075E54"
        android:theme="@style/ThemeOverlay.AppCompat.Dark.ActionBar"
        app:layout_constraintTopToTopOf="parent">

        <TextView
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:text="WhatsApp Chat Analyzer"
            android:textColor="#FFFFFF"
            android:textSize="20sp"
            android:textStyle="bold" />
    </androidx.appcompat.widget.Toolbar>

    <!-- Empty State Vector / Guide -->
    <LinearLayout
        android:id="@+id/tvEmptyState"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:gravity="center"
        android:orientation="vertical"
        android:padding="24dp"
        android:visibility="visible"
        app:layout_constraintBottom_toBottomOf="parent"
        app:layout_constraintTop_toBottomOf="@id/toolbar">

        <ImageView
            android:layout_width="160dp"
            android:layout_height="160dp"
            android:src="@android:drawable/ic_menu_save"
            android:contentDescription="Save Icon"
            android:alpha="0.6" />

        <TextView
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:layout_marginTop="16dp"
            android:alignment="center"
            android:gravity="center"
            android:text="No Chat Sessions Recorded"
            android:textColor="#333333"
            android:textSize="18sp"
            android:textStyle="bold" />

        <TextView
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:layout_marginTop="8dp"
            android:alignment="center"
            android:gravity="center"
            android:text="Export your whatsapp chat as a TXT or ZIP file from phone settings, tap the Plus button below to import, and view immediate stats!"
            android:textColor="#555555"
            android:textSize="14sp" />
    </LinearLayout>

    <!-- RecyclerView listing saved chats -->
    <androidx.recyclerview.widget.RecyclerView
        android:id="@+id/rvChats"
        android:layout_width="match_parent"
        android:layout_height="0dp"
        android:visibility="gone"
        app:layout_constraintBottom_toBottomOf="parent"
        app:layout_constraintTop_toBottomOf="@id/toolbar" />

    <!-- Open Device Explorer Action FAB -->
    <com.google.android.material.floatingactionbutton.FloatingActionButton
        android:id="@+id/fabImport"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:layout_margin="24dp"
        android:src="@android:drawable/ic_input_add"
        android:contentDescription="Plus Symbol"
        app:backgroundTint="#25D366"
        app:tint="#FFFFFF"
        app:layout_constraintBottom_toBottomOf="parent"
        app:layout_constraintEnd_toEndOf="parent" />

</androidx.constraintlayout.widget.ConstraintLayout>`
  }
];

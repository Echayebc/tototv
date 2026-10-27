package com.echayebc.staretv

import android.os.Bundle
import android.widget.Button
import android.widget.EditText
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.google.android.exoplayer2.ExoPlayer
import com.google.android.exoplayer2.MediaItem
import com.google.android.exoplayer2.ui.PlayerView
import okhttp3.*
import org.json.JSONArray
import java.io.IOException

class MainActivity : AppCompatActivity() {
    private lateinit var player: ExoPlayer
    private val client = OkHttpClient()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        player = ExoPlayer.Builder(this).build()
        findViewById<PlayerView>(R.id.player_view).player = player

        val etUser = findViewById<EditText>(R.id.et_user)
        val etPass = findViewById<EditText>(R.id.et_pass)
        val etHost = findViewById<EditText>(R.id.et_host)
        val btn = findViewById<Button>(R.id.btn_connect)
        val recycler = findViewById<RecyclerView>(R.id.recycler)
        recycler.layoutManager = LinearLayoutManager(this)

        btn.setOnClickListener {
            val user = etUser.text.toString().trim()
            val pass = etPass.text.toString().trim()
            var host = etHost.text.toString().trim().removeSuffix("/")

            val apiUrl = "$host/player_api.php?username=$user&password=$pass&action=get_live_streams"
            val request = Request.Builder().url(apiUrl).build()
            
            client.newCall(request).enqueue(object: Callback{
                override fun onFailure(call: Call, e: IOException) {
                    runOnUiThread { Toast.makeText(this@MainActivity, "فشل: ${e.message}", Toast.LENGTH_LONG).show() }
                }
                override fun onResponse(call: Call, response: Response) {
                    val json = response.body?.string() ?: return
                    val arr = JSONArray(json)
                    val list = mutableListOf<Pair<String,String>>()
                    for(i in 0 until arr.length()){
                        val o = arr.getJSONObject(i)
                        list.add(o.getString("name") to o.getString("stream_id"))
                    }
                    runOnUiThread {
                        recycler.adapter = ChannelAdapter(list){ streamId ->
                            val videoUrl = "$host/live/$user/$pass/$streamId.m3u8"
                            player.setMediaItem(MediaItem.fromUri(videoUrl))
                            player.prepare()
                            player.play()
                        }
                    }
                }
            })
        }
    }
    override fun onDestroy() { super.onDestroy(); player.release() }
}

class ChannelAdapter(private val items: List<Pair<String,String>>, private val onClick: (String)->Unit) : RecyclerView.Adapter<ChannelAdapter.VH>(){
    class VH(val view: android.widget.TextView): RecyclerView.ViewHolder(view)
    override fun onCreateViewHolder(p: android.view.ViewGroup, t: Int): VH {
        val tv = android.widget.TextView(p.context).apply { setPadding(32,36,32,36); textSize = 30f; setTextColor(-1); background = android.graphics.drawable.GradientDrawable().apply{setColor(0xFF1E1E1E.toInt()); cornerRadius=24f} }
        return VH(tv)
    }
    override fun getItemCount() = items.size
    override fun onBindViewHolder(h: VH, p: Int) { h.view.text = items[p].first; h.view.setOnClickListener { onClick(items[p].second) } }
}
